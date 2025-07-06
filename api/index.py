from fastapi import FastAPI, HTTPException, Path

from subprocess import Popen, PIPE
from dotenv import load_dotenv
import os
from erc7730.generate.generate import generate_descriptor
from erc7730.model.input.descriptor import InputERC7730Descriptor
import os
import traceback
from fastapi.encoders import jsonable_encoder
import inspect

import json

from fastapi.responses import JSONResponse
from pydantic import BaseModel


def load_env():
    etherscan_api_key = os.getenv("ETHERSCAN_API_KEY")
    env = os.environ.copy()
    env["ETHERSCAN_API_KEY"] = etherscan_api_key
    env["XDG_CACHE_HOME"] = '/tmp'
    load_dotenv()

def safe_generate_descriptor(**kwargs):
    """Safely call generate_descriptor, removing unsupported parameters."""
    # Get the function signature
    sig = inspect.signature(generate_descriptor)
    available_params = list(sig.parameters.keys())
    
    # Debug logging
    print(f"🔍 Available parameters in generate_descriptor: {available_params}")
    print(f"🔍 Requested parameters: {list(kwargs.keys())}")
    print(f"🔍 Has 'auto' parameter: {'auto' in available_params}")
    
    # Filter kwargs to only include parameters that the function accepts
    filtered_kwargs = {k: v for k, v in kwargs.items() if k in sig.parameters}
    removed_params = {k: v for k, v in kwargs.items() if k not in sig.parameters}
    
    if removed_params:
        print(f"⚠️ Removed unsupported parameters: {removed_params}")
    
    print(f"✅ Calling generate_descriptor with: {filtered_kwargs}")
    return generate_descriptor(**filtered_kwargs)

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

class Message(BaseModel):
    message: str

class Props(BaseModel):
    abi: str | None = None
    address: str | None = None
    chain_id: int | None = None
    auto: bool = False

@app.get("/api/py/debug")
def debug_info():
    """Debug endpoint to check function signature and library version."""
    try:
        sig = inspect.signature(generate_descriptor)
        params = list(sig.parameters.keys())
        
        # Try to get version info
        try:
            import erc7730
            version = getattr(erc7730, '__version__', 'unknown')
        except:
            version = 'unknown'
            
        return {
            "function_parameters": params,
            "has_auto_parameter": "auto" in params,
            "library_version": version,
            "function_signature": str(sig)
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/py/generateERC7730", response_model=InputERC7730Descriptor, responses={400: {"model": Message}})
def run_erc7730(params: Props):
    """Generate the 'erc7730' based on an ABI."""
    try:
        load_env()
        result = None

        # we only manage ethereum mainnet
        chain_id = params.chain_id or 1
        
        if (params.abi):
            result = safe_generate_descriptor(
                chain_id=chain_id,
                contract_address='0xdeadbeef00000000000000000000000000000000', # because it's mandatory mock address see with laurent
                abi=params.abi,
                auto=params.auto
            )
       
        if (params.address):
            result = safe_generate_descriptor(
                chain_id=chain_id,
                contract_address=params.address,
                auto=params.auto
            )
            
        if result is None:
            return JSONResponse(status_code=404, content={"message": "No ABI or address provided"})
        
        return result

    except Exception as e:
        print('error', e)
        error_message = str(e)
        return JSONResponse(status_code=404, content={"message": error_message})