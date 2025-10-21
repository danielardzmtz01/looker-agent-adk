# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import datetime
import logging
import re
from collections.abc import AsyncGenerator
from typing import Literal
from app.utils.looker_tools import generate_looker_url

from google.adk.agents import BaseAgent, LlmAgent, LoopAgent, SequentialAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.adk.planners import BuiltInPlanner
from google.adk.tools import google_search
from google.adk.tools.agent_tool import AgentTool
from google.genai import types as genai_types
from pydantic import BaseModel, Field

from .config import config
looker_url_agent = LlmAgent(
    name="looker_url_agent",
    model=config.worker_model, # Using worker_model from config for the LLM
    instruction=f"""
    You are a Looker expert assistant. Your ONLY function is to use the 'generate_looker_url' tool to create a Looker URL.
    You MUST extract all required parameters from the user's request.
    Once the tool is called and returns a result, you MUST return ONLY the raw JSON output of the tool.
    Do not add any conversational text or formatting.
    Your response must be a single, raw JSON object.

    Current Date: {datetime.datetime.now().strftime("%Y-%m-%d")}
    """,
    tools=[generate_looker_url], # The tool for generating Looker URLs
    description="Generates Looker embeded urls for explores"
)

# This declares 'looker_url_agent' as the main agent for your application.
root_agent = looker_url_agent
