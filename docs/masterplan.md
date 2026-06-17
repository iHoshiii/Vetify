```markdown
# Vetify Project Master Plan

This master plan outlines the comprehensive development lifecycle, architecture strategy, data models, and phased implementation schedule for Vetify.

---

## 1. Executive Project Summary
Vetify is a cloud-native, open-source pet health platform engineered to bridge the gap between instant AI-driven digital triage and physical professional veterinary care. The application leverages an asynchronous Python backend and a component-based frontend framework to deliver geospatial mapping, automated nutritional tracking, interactive educational anatomy, and automated medical screening under strict cloud-hosted free-tier constraints.

---

## 2. System Architecture & Component Mapping


```

[ Client Interface ] <---> [ FastAPI Gateway (Uvicorn) ] <---> [ Cloud LLM APIs ]
│
▼
[ MongoDB Atlas ]
├── Geospatial Index ($near)
└── Vector Search Index (RAG)

```

### 2.1 Backend Layer (FastAPI / Uvicorn)
* **ASGI Server:** Uvicorn implements the Asynchronous Server Gateway Interface to process high-throughput concurrent WebSocket and HTTP requests without thread blocking.
* **API Router:** FastAPI orchestrates computational endpoints, executes background tasks, and manages data streams.
* **Validation Engine:** Pydantic enforces data type integrity, automatic request serialization, and runtime schema evaluation.

### 2.2 Orchestration & Inference Layer (LangChain)
* **Agent Framework:** Executes structural tool calling, state management, and semantic routing based on real-time token classification.
* **RAG Component:** Combines document chunking strategies with vector transformations to fetch deterministic medical lookups out of data vectors.
* **Inference Hosts:** Google AI Studio (Gemini 1.5 Flash) and Groq Cloud (Llama-3-70b) execute serverless processing.

### 2.3 Database Layer (MongoDB Atlas Cluster)
* **Document Store:** Houses highly dynamic BSON records for user collections, appointment pipelines, meal logs, and article indexes.
* **Geospatial Processing:** Configures a `2dsphere` layout map to perform spherical geometry calculations across latitude/longitude pairs.
* **Vector Index:** Executes k-nearest neighbor (k-NN) vector computations against dense mathematical embeddings.

---

## 3. Core Data Schemas (BSON / Pydantic Representations)

### 3.1 Users & Pets Collection
```json
{
  "_id": "ObjectId",
  "email": "string",
  "created_at": "datetime",
  "pets": [
    {
      "pet_id": "string",
      "name": "string",
      "species": "string",
      "breed": "string",
      "age_months": "integer",
      "weight_kg": "float",
      "allergies": ["string"],
      "dietary_restrictions": ["string"]
    }
  ]
}

```

### 3.2 Clinics & Professionals Collection

```json
{
  "_id": "ObjectId",
  "name": "string",
  "license_number": "string",
  "is_verified": "boolean",
  "contact_phone": "string",
  "address": {
    "street": "string",
    "city": "string",
    "coordinates": {
      "type": "Point",
      "coordinates": [121.1444, 16.4822] 
    }
  }
}

```

### 3.3 Medical Knowledge Vector Collection

```json
{
  "_id": "ObjectId",
  "source_document": "string",
  "text_content": "string",
  "embedding": [0.0142, -0.0234, 0.1045]
}

```

---

## 4. Phased Implementation Schedule

### Phase 1: Environment & Cloud Database Initialization

**Duration: Weeks 1–2**

* **Task 1.1:** Initialize the monorepo workspace containing separated `/backend` and `/frontend` directories. Set up local version control rules and lockfile policies.
* **Task 1.2:** Provision the MongoDB Atlas M0 Cluster. Establish network access white-lists and database read/write permissions.
* **Task 1.3:** Build database index components. Execute administrative scripts to build the `2dsphere` indexing on the location collection, and compile the Vector Search configurations within the medical knowledge collection.
* **Task 1.4:** Define Pydantic base models mirroring document structures to guarantee end-to-end data validation before persistence operations.

### Phase 2: LangChain Pipeline & Asynchronous API Development

**Duration: Weeks 3–5**

* **Task 2.1:** Implement secure API middleware connections targeting Groq and Google AI Studio platforms. Create environment variables utilizing secure local configuration protocols.
* **Task 2.2:** Build the semantic router inside the LangChain pipeline. Define prompt logic assigning safe thresholds to general pet advice queries while isolating critical health indicators (e.g., hemorrhage, poisoning, continuous vomiting). Program the fallback response: "Contact a professional veterinarian doctor" when thresholds are exceeded.
* **Task 2.3:** Enforce strict structured output formatting using Pydantic parsers. Ensure that cloud LLMs output structured JSON structures containing Boolean indicator status variables and emergency contact triggers.
* **Task 2.4:** Program the geospatial fallback middleware. When the AI agent triggers an emergency or complex condition, it must extract location coordinates, execute an automated MongoDB `$near` lookup query, and append the details of the nearest physical clinic or doctor directly into the response payload.
* **Task 2.5:** Create the automated Meal Planner system endpoint. Instruct the cloud LLM to construct structural 7-day balanced meal configurations based on pet species, age, weight, and allergies.
* **Task 2.6:** Develop the Blog Content Management System (CMS) endpoint to serve articles about veterinary clinics and health tips.

### Phase 3: UI Layout Design & Map Integration

**Duration: Weeks 6–8**

* **Task 3.1:** Construct the UI Shell using Next.js or React Native. Build stateful interface tracks for the main application workspaces: Chat Portal, Interactive Locator Map, Professional Hiring Marketplace, Anatomy Viewer, and Nutritional Dashboard.
* **Task 3.2:** Connect the real-time chat pipeline to the FastAPI gateway. Implement asynchronous loading animations, handle multi-turn chat records, and design responsive high-priority layout banners for critical triage interventions (nearest vet clinic details).
* **Task 3.3:** Inject the Mapbox GL or Google Maps interface engine. Read location payloads sent by the backend server to plot pins dynamically across map frames for all local clinics.
* **Task 3.4:** Build the visual Anatomy UI tool. Structure vector graphics (SVGs) mapping distinct animal parts for basic animals (dogs, cats, birds). Add click action hooks on structural components to fetch underlying biological details from the database using clean FastAPI routes.
* **Task 3.5:** Implement the Professional Marketplace UI where users can search, view profiles, and hire licensed veterinary doctors.

### Phase 4: Integration Verification & Cloud Deployment

**Duration: Weeks 9–10**

* **Task 4.1:** Launch automated testing cycles simulating extreme veterinary emergency descriptors. Confirm that the LangChain supervisor intercepts critical alerts, sets accurate emergency statuses, and maps nearby medical clinics without exceptions.
* **Task 4.2:** Run cross-origin resource sharing (CORS) safety checks and verify that client state maps update smoothly following large payload mutations.
* **Task 4.3:** Deploy the static frontend client architecture directly to Vercel or Netlify. Connect deployment configurations to production distribution pipelines.
* **Task 4.4:** Host the backend FastAPI framework on Render or Railway server environments. Configure runtime execution policies using production command parameters: `uvicorn main:app --host 0.0.0.0 --port $PORT`. Validate system continuity.

```

```