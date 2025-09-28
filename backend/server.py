from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Direction State Models
class DirectionState(BaseModel):
    pdArraysMarked: bool = False
    biasFrame: Optional[str] = None  # 'weekly', 'daily', 'monthly'
    biasType: Optional[str] = None   # 'bullish', 'bearish', 'none'
    arrayInteraction: Optional[str] = None  # 'bullish_rejection', 'bearish_rejection', etc.
    sweepExpected: bool = False
    finalOutcome: Optional[str] = None  # 'bullish', 'bearish', 'no_trade'
    completed: bool = False

# Stage State Models  
class StageState(BaseModel):
    atPDArray: bool = False
    stopsRun: bool = False
    displacementOccurred: bool = False
    mssOrFvgCut: bool = False
    timeframesAligned: bool = False
    completed: bool = False

# Entry State Models
class EntryState(BaseModel):
    swingPointIdentified: bool = False
    stopRunConfirmed: bool = False
    pdaRejectionConfirmed: bool = False
    fibonacciApplied: bool = False
    oteMet: bool = False
    entryDefined: bool = False
    slTpSet: bool = False
    rrAcceptable: bool = False
    completed: bool = False

# Trading Setup Models
class TradingSetup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    direction: DirectionState
    stage: StageState  
    entry: EntryState
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class TradingSetupCreate(BaseModel):
    name: str
    direction: DirectionState
    stage: StageState
    entry: EntryState

class TradingSetupUpdate(BaseModel):
    name: Optional[str] = None
    direction: Optional[DirectionState] = None
    stage: Optional[StageState] = None
    entry: Optional[EntryState] = None

# Legacy status check models (keeping for compatibility)
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Trading Setup Routes
@api_router.post("/setups", response_model=TradingSetup)
async def create_trading_setup(setup_data: TradingSetupCreate):
    """Create a new trading setup"""
    try:
        setup_dict = setup_data.dict()
        setup_obj = TradingSetup(**setup_dict)
        
        # Insert into database
        result = await db.trading_setups.insert_one(setup_obj.dict())
        
        if result.inserted_id:
            return setup_obj
        else:
            raise HTTPException(status_code=500, detail="Failed to create trading setup")
            
    except Exception as e:
        logging.error(f"Error creating trading setup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/setups", response_model=List[TradingSetup])
async def get_trading_setups(limit: int = 50, skip: int = 0):
    """Get all trading setups with pagination"""
    try:
        cursor = db.trading_setups.find().sort("updatedAt", -1).skip(skip).limit(limit)
        setups = await cursor.to_list(length=limit)
        return [TradingSetup(**setup) for setup in setups]
    except Exception as e:
        logging.error(f"Error fetching trading setups: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/setups/{setup_id}", response_model=TradingSetup)
async def get_trading_setup(setup_id: str):
    """Get a specific trading setup by ID"""
    try:
        setup = await db.trading_setups.find_one({"id": setup_id})
        if not setup:
            raise HTTPException(status_code=404, detail="Trading setup not found")
        return TradingSetup(**setup)
    except Exception as e:
        logging.error(f"Error fetching trading setup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/setups/{setup_id}", response_model=TradingSetup)
async def update_trading_setup(setup_id: str, setup_update: TradingSetupUpdate):
    """Update an existing trading setup"""
    try:
        # Get existing setup
        existing_setup = await db.trading_setups.find_one({"id": setup_id})
        if not existing_setup:
            raise HTTPException(status_code=404, detail="Trading setup not found")
        
        # Prepare update data
        update_data = setup_update.dict(exclude_unset=True)
        update_data["updatedAt"] = datetime.utcnow()
        
        # Update in database
        result = await db.trading_setups.update_one(
            {"id": setup_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0 or result.matched_count > 0:
            # Return updated setup
            updated_setup = await db.trading_setups.find_one({"id": setup_id})
            return TradingSetup(**updated_setup)
        else:
            raise HTTPException(status_code=500, detail="Failed to update trading setup")
            
    except Exception as e:
        logging.error(f"Error updating trading setup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/setups/{setup_id}")
async def delete_trading_setup(setup_id: str):
    """Delete a trading setup"""
    try:
        result = await db.trading_setups.delete_one({"id": setup_id})
        if result.deleted_count > 0:
            return {"message": "Trading setup deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Trading setup not found")
    except Exception as e:
        logging.error(f"Error deleting trading setup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/setups/stats/summary")
async def get_setup_stats():
    """Get summary statistics for trading setups"""
    try:
        total_setups = await db.trading_setups.count_documents({})
        
        # Count completed sections
        completed_direction = await db.trading_setups.count_documents({"direction.completed": True})
        completed_stage = await db.trading_setups.count_documents({"stage.completed": True})  
        completed_entry = await db.trading_setups.count_documents({"entry.completed": True})
        
        # Count by final outcomes
        bullish_setups = await db.trading_setups.count_documents({"direction.finalOutcome": "bullish"})
        bearish_setups = await db.trading_setups.count_documents({"direction.finalOutcome": "bearish"})
        no_trade_setups = await db.trading_setups.count_documents({"direction.finalOutcome": "no_trade"})
        
        return {
            "total_setups": total_setups,
            "completed_sections": {
                "direction": completed_direction,
                "stage": completed_stage,
                "entry": completed_entry
            },
            "outcomes": {
                "bullish": bullish_setups,
                "bearish": bearish_setups,
                "no_trade": no_trade_setups
            }
        }
    except Exception as e:
        logging.error(f"Error getting setup stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Legacy routes (keeping for compatibility)
@api_router.get("/")
async def root():
    return {"message": "Forex Trading Plan API", "version": "1.0.0"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()