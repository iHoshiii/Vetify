flowchart TD
    %% Styling Configuration
    classDef startEnd fill:#ECEFF1,stroke:#37474F,stroke-width:2px,color:#000;
    classDef menu fill:#E1F5FE,stroke:#0288D1,stroke-width:2px,color:#000;
    classDef ai fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#000;
    classDef geo fill:#FFF3E0,stroke:#F57C00,stroke-width:2px,color:#000;
    classDef data fill:#EDE7F6,stroke:#5E35B1,stroke-width:2px,color:#000;

    Start([User Opens Vetify App]):::startEnd

    %% App Features Navigation Hub
    Start --> NavigationHub{Select Feature / Tab}
    
    %% Feature 1: AI Vet Chat
    NavigationHub -->|AI Vet Interface| Chat[User submits pet health question]:::ai
    Chat --> Router{LangChain AI Agent:<br/>Analyze Query Complexity}:::ai
    
    Router -->|Simple Case<br/>e.g., Diet, Habits| RAG[Fetch details via MongoDB Vector Base]:::ai
    RAG --> DisplayAnswer[AI displays safe first-aid advice]:::ai
    DisplayAnswer --> Chat
    
    Router -->|Complex / Emergency<br/>e.g., Poisoning, Bleeding| Alert[Trigger Critical Safety Warning]:::geo
    Alert --> GeoLookup[Run MongoDB $near Query using User Location]:::geo
    GeoLookup --> DirectToVet[Display urgent message + Details of Nearest Vet Clinic]:::geo
    DirectToVet --> MapTab
    
    %% Feature 2: Map & Professional Search
    NavigationHub -->|Map / Contact Tab| MapTab[Load Interactive Map Engine]:::geo
    MapTab --> FetchVets[Query MongoDB for Registered Clinics & Doctors]:::geo
    FetchVets --> PinVets[Render Location Pins on UI Map]:::geo
    PinVets --> Interaction{User Interaction}
    Interaction -->|Click Clinic Pin| GetRoute[Get routing directions to Physical Clinic]:::geo
    Interaction -->|Click Doctor Profile| ContactDoc[Hire Licensed Veterinary Doctor]:::data

    %% Feature 3: Interactive Anatomy Viewer
    NavigationHub -->|Anatomy Tab| Anatomy[Select Animal: Dog, Cat, Bird...]:::data
    Anatomy --> RenderSVG[Render Interactive 2D SVG Layers]:::data
    RenderSVG --> ClickPart[User Taps Specific Organ/Bone System]:::data
    ClickPart --> FetchBio[Pull structural health & function data from DB]:::data
    
    %% Feature 4: Meal Planner
    NavigationHub -->|Meal Plan Tab| InputPet[Enter Pet Details:<br/>Age, Weight, Species, Allergies]:::data
    InputPet --> AIChef[LangChain queries Cloud LLM for Structured JSON]:::ai
    AIChef --> SavePlan[Store dynamic weekly plan to MongoDB Collections]:::data
    SavePlan --> ShowCalendar[Render structured 7-Day feeding schedule]:::data

    %% Feature 5: Blogs
    NavigationHub -->|Blogs Tab| LoadBlogs[Fetch veterinary articles & clinic spotlights from DB]:::data

    %% End nodes back to Hub
    FetchBio --> NavigationHub
    ShowCalendar --> NavigationHub
    LoadBlogs --> NavigationHub

    %% Apply Style Classes
    class Start startEnd;
    class NavigationHub menu;
    class Chat,Router,RAG,DisplayAnswer,AIChef ai;
    class Alert,GeoLookup,DirectToVet,MapTab,FetchVets,PinVets,GetRoute geo;
    class ContactDoc,Anatomy,RenderSVG,ClickPart,FetchBio,InputPet,SavePlan,ShowCalendar,LoadBlogs data;