Here is the README.md translated into English, based on the structure you provided and modified for your Looker agent.

-----

# Looker URL ADK Agent Quickstart

The **Looker URL ADK Agent Quickstart** is a production-ready blueprint that demonstrates how to build a simple backend agent that uses custom tools with the Google Agent Development Kit (ADK).

It's built to show how the ADK can power a FastAPI backend to connect with custom tools (like a Looker URL generator) and serve a React frontend.

<table>
<thead>
<tr>
<th colspan="2">Key Features</th>
</tr>
</thead>
<tbody>
<tr>
<td>🏗️\</td>
<td><strong>Fullstack & Production-Ready:</strong> A complete React frontend and an ADK-powered FastAPI backend. Includes deployment options for <a href="[https://cloud.google.com/run](https://cloud.google.com/run)">Google Cloud Run</a> and <a href="[https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview)">Vertex AI Agent Engine</a>.</td>
</tr>
<tr>
<td>🧠</td>
<td><strong>Simple, Tool-Based Agent:</strong> Demonstrates an <code>LlmAgent</code> that uses Gemini to interpret user natural language and call a custom tool (<code>generate_looker_url</code>) with the correct parameters.</td>
</tr>
<tr>
<td>🔗</td>
<td><strong>Looker Integration:</strong> The backend is designed to take a natural language request and return a signed Looker URL, ready to be embedded in an <code>iframe</code> on the frontend.</td>
</tr>
</tbody>
</table>

This project adapts the foundation from the [Gemini FullStack LangGraph Quickstart](https://github.com/google-gemini/gemini-fullstack-langgraph-quickstart) for the frontend application.

## 🚀 Getting Started: From Zero to Running Agent in 1 Minute

**Prerequisites:** **[Python 3.10+](https://www.python.org/downloads/)**, **[Node.js](https://nodejs.org/)**, **[uv](https://github.com/astral-sh/uv)**

You have two options to get started. Choose the one that best fits your setup:

  * A. **[Google AI Studio](#a-google-ai-studio)**: Choose this path if you want to use a **Google AI Studio API key**.
  * B. **[Google Cloud Vertex AI](#b-google-cloud-vertex-ai)**: Choose this path if you want to use an existing **Google Cloud project** for authentication.

-----

### A. Google AI Studio

You'll need a **[Google AI Studio API Key](https://aistudio.google.com/app/apikey)**.

#### Step 1: Clone Repository

Clone the repository containing your code (or the original `adk-samples` repo if you are modifying it).

```bash
# Example if using the samples repo:
git clone https://github.com/google/adk-samples.git
cd adk-samples/python/agents/gemini-fullstack
```

**Important:** Be sure to replace the `app/agent.py` and `app/utils/looker_tools.py` files with your custom code.

#### Step 2: Set Environment Variables

Create a `.env` file in the `app` folder (replace `YOUR_AI_STUDIO_API_KEY` with your key):

```bash
echo "GOOGLE_GENAI_USE_VERTEXAI=FALSE" >> app/.env
echo "GOOGLE_API_KEY=YOUR_AI_STUDIO_API_KEY" >> app/.env
```

#### Step 3: Install & Run

From the project's root directory (`gemini-fullstack`), install dependencies and start the servers.

```bash
make install && make dev
```

Your agent is now running at `http://localhost:5173`.

-----

### B. Google Cloud Vertex AI

You'll also need: **[Google Cloud SDK](https://cloud.google.com/sdk/docs/install)** and a **Google Cloud Project** with the **Vertex AI API** enabled.

#### Step 1: Create Project from Template

This command uses the [Agent Starter Pack](https://goo.gle/agent-starter-pack) to create a new directory (`my-looker-agent`) with all the necessary code.

```bash
# Create and activate a virtual environment
python -m venv .venv && source .venv/bin/activate # On Windows: .venv\Scripts\activate

# Install the starter pack and create your project
pip install --upgrade agent-starter-pack
agent-starter-pack create my-looker-agent -a adk@gemini-fullstack
```

**Important:** Once created, navigate to `my-looker-agent/app/` and replace the contents of `agent.py` with your `looker_url_agent` and add `utils/looker_tools.py` with your custom function.

#### Step 2: Install & Run

Navigate into your **newly created project folder**, then install dependencies and start the servers.

```bash
cd my-looker-agent && make install && make dev
```

Your agent is now running at `http://localhost:5173`.

## ☁️ Cloud Deployment

> **Note:** The cloud deployment instructions below apply only if you chose the **Google Cloud Vertex AI** option.

You can quickly deploy your agent to a **development environment** on Google Cloud.

```bash
# Replace YOUR_DEV_PROJECT_ID with your actual Google Cloud Project ID
gcloud config set project YOUR_DEV_PROJECT_ID
make backend
```

For robust, **production-ready deployments** with automated CI/CD, please follow the detailed instructions in the **[Agent Starter Pack Development Guide](https://googlecloudplatform.github.io/agent-starter-pack/guide/development-guide.html#b-production-ready-deployment-with-ci-cd)**.

-----

## Agent Details

| Attribute | Description |
| :--- | :--- |
| **Interaction Type** | Tool-Based |
| **Complexity** | Simple |
| **Agent Type** | Single Agent |
| **Components** | LLM, Function calling, Custom Tool, FastAPI Backend |
| **Vertical** | Business Intelligence / Data |

## How the Agent Works

The backend agent, defined in `app/agent.py`, follows a simple, direct workflow to generate a Looker URL from a user request.

1.  **User Request:** The user sends a natural language request from the frontend (e.g., "show me sales for product 'X' on instance 'Y'").
2.  **Agent Processing:** The request is received by the `root_agent` (which is the `looker_url_agent`).
3.  **Tool Calling:** The `LlmAgent`, guided by its instructions, understands it must use the `generate_looker_url` tool. It extracts the necessary parameters (like `looker_instance`, `model_id`, `explore_id`, `fields`, `filters`) from the user's request.
4.  **URL Generation:** The agent invokes the `generate_looker_url` tool (defined in `app/utils/looker_tools.py`) with the extracted parameters.
5.  **URL Construction:** The custom tool builds the Looker URL string.
6.  **JSON Response:** Following its instructions, the agent returns **only the raw JSON** generated by the tool. This JSON contains the final URL.
7.  **Frontend Rendering:** The frontend receives the JSON object, extracts the `looker_url`, and uses it as the `src` for an `iframe`, thereby displaying the embedded Looker explore.

## Customization

You can modify and extend this agent's behavior by editing the backend code.

  * **Modifying Agent Logic:** The core logic is in `app/agent.py`. You can change the `looker_url_agent`'s instructions (the prompt) to, for example, ask clarifying questions if parameters are missing, or change the LLM used (`config.worker_model`).
  * **Adjusting the Tool:** The URL generation logic is in `app/utils/looker_tools.py`. You can modify the `generate_looker_url` function to change how the URL is built, handle different parameters, or add more complex authentication logic.
