// All content comes from Giri's 2025–2027 résumés (public/resume.pdf is the 2027 one).
// Edit text, numbers and links here — the rest of the site reads from this file.

export const profile = {
  name: 'Peruri Giri Sainath',
  short: 'Giri Sainath',
  role: 'Agentic AI Engineer',
  title: 'Senior Associate',
  company: 'State Street',
  location: 'Telangana, India',
  // State-level marker for the globe, not a street address.
  geo: { lat: 18, lon: 79, label: '≈18°N 79°E' },
  timeZone: 'Asia/Kolkata',
  email: 'girisainath15@gmail.com',
  linkedin: 'https://www.linkedin.com/in/girisainath',
  linkedinShort: 'in/girisainath',
  github: '', // add a GitHub URL here and a GitHub button appears in the contact section
  resume: 'resume.pdf',
  tagline: 'I build RAG platforms, multi-agent systems and LLM infrastructure — and take them from PoC to production.',
};

// Hero monitor (top-right HUD)
export const heroGauges = [
  { kind: 'needle', label: 'Latency', value: '4s', sub: 'was 9s', pct: 0.4, ghost: 0.9 },
  { kind: 'ring', label: 'Uptime', value: '99.9%', sub: 'SSGenAI', pct: 0.999 },
  { kind: 'ring', label: 'Teams', value: '50+', sub: 'onboarded', pct: 0.86, hot: true },
];

export const heroBars = [
  ['Mapping accuracy', '80%+', 0.8],
  ['Throughput', '+35%', 0.35],
  ['Retrieval consistency', '2–3×', 0.83],
];

// Counted straight from the résumé.
export const inventory = [
  ['RTV', 7, 'retrievers'],
  ['CHK', 7, 'chunking strategies'],
  ['CON', 6, 'data connectors'],
  ['AGT', 4, 'agents'],
  ['SVC', 12, 'microservices (12+)'],
];

// Overview → impact gauges
export const impact = [
  { value: '4s', from: '9s', label: 'LLM inference latency', note: 'RAGAS', pct: 0.56, delta: '−56%' },
  { value: '+35%', label: 'Retrieval throughput', note: 'RAGAS', pct: 0.35 },
  { value: '80%+', label: 'Schema-mapping accuracy', note: 'Data Exploration Agent', pct: 0.8 },
  { value: '2–3 wk', from: '6–8 mo', label: 'Mapping turnaround', note: 'Data Exploration Agent', pct: 0.9, delta: '≈−90%' },
  { value: '99.9%', label: 'Platform uptime', note: 'SSGenAI', pct: 0.999 },
  { value: '50+', label: 'Teams onboarded', note: 'RAGAS 30+ · SSGenAI 20+', dots: 50 },
];

export const about = {
  whoami: 'Peruri Giri Sainath · Senior Associate, Agentic AI Engineer @ State Street',
  summary: [
    'Nearly three years at State Street building Python backends and LLM systems: RAG platforms, multi-agent orchestration, guardrails and observability.',
    'Proven track record taking PoCs to production — 50+ teams onboarded at 99.9% uptime.',
  ],
  education: "Bachelor's in Computer Science & Engineering (Data Science) · GITAM University · 2020–24 · CGPA 9.19/10",
  certs: 'Microsoft Azure AZ-900 · Azure AI-900',
};

// `git log` of the job, newest first.
export const career = [
  { hash: 'f41c0de', when: 'Now', title: 'Enterprise AI Observability Platform', role: 'Senior Associate — Agentic AI Engineer', note: '12+ FastAPI microservices · OpenTelemetry tracing · 1–2 min to dashboard', head: true },
  { hash: 'd3a9e17', when: '2025–26', title: 'Data Exploration Agent', role: 'Senior Associate — Agentic AI Engineer', note: 'Multi-agent schema mapping · 80%+ accuracy · months → weeks' },
  { hash: 'b7e2c05', when: '2025', title: 'RAGAS — RAG as a Service', role: 'Senior AI/ML Associate Engineer', note: 'Latency 9s → 4s · +35% throughput · 30+ teams' },
  { hash: '92ac4f1', when: '2024', title: 'SSGPT & RAI SDK', role: 'AI/ML Python Developer · joined State Street, Jan 2024', note: 'Self-service copilot and the guardrailed LLM gateway behind it' },
  { hash: '0e15a3b', when: '2020–24', title: "Bachelor's, CSE (Data Science)", role: 'GITAM University · CGPA 9.19/10', note: 'Certified: Azure AZ-900 · Azure AI-900', root: true },
];

// Data Exploration Agent topology. x/y are SVG coordinates in a 600×350 viewBox.
export const agentGraph = {
  nodes: [
    { id: 'q', label: 'SME question', x: 300, y: 26, io: true, desc: 'A subject-matter expert asks how source data should map to the target data model.' },
    { id: 'orch', label: 'Orchestrator', x: 300, y: 98, desc: 'Routes each question to the agent that should handle it.' },
    { id: 'res', label: 'Researcher', sub: 'RAG · schema docs', x: 104, y: 182, desc: 'Works over RAG pipelines of the target-schema documentation and gives a justification and references for every mapping recommendation.' },
    { id: 'eda', label: 'EDA agent', sub: 'SQL · Python', x: 300, y: 182, desc: 'Generates, validates and executes SQL queries and Python code so SMEs understand the source data quickly.' },
    { id: 'gen', label: 'General', sub: 'data-model Q&A', x: 496, y: 182, desc: 'Handles general data-model questions and process clarifications.' },
    { id: 'val', label: 'Validator', sub: 'rules · consistency', x: 202, y: 260, desc: 'Reviews Researcher and EDA output for correctness, consistency and alignment with the target data-model rules, and flags mismatches.' },
    { id: 'map', label: 'Mapping file ✓', x: 202, y: 326, io: true, desc: 'Validated mapping recommendations — 80%+ accurate, in 2–3 weeks instead of 6–8 months.' },
    { id: 'ans', label: 'Guidance ✓', x: 496, y: 326, io: true, desc: 'Answers go straight back to the SME.' },
  ],
  edges: [['q', 'orch'], ['orch', 'res'], ['orch', 'eda'], ['orch', 'gen'], ['res', 'val'], ['eda', 'val'], ['val', 'map'], ['gen', 'ans']],
  runs: [
    [
      { nodes: ['q'], edges: [], log: 'SME asks how a source field maps to the target model' },
      { nodes: ['orch'], edges: ['q-orch'], log: 'orchestrator → routes to researcher + eda' },
      { nodes: ['res', 'eda'], edges: ['orch-res', 'orch-eda'], log: 'researcher cites schema docs · eda profiles the source with SQL' },
      { nodes: ['val'], edges: ['res-val', 'eda-val'], log: 'validator checks data-model rules, flags mismatches' },
      { nodes: ['map'], edges: ['val-map'], log: '✓ mapping recommendation, with references' },
    ],
    [
      { nodes: ['q'], edges: [], log: 'SME asks a process question' },
      { nodes: ['orch'], edges: ['q-orch'], log: 'orchestrator → routes to general' },
      { nodes: ['gen'], edges: ['orch-gen'], log: 'general answers from data-model knowledge' },
      { nodes: ['ans'], edges: ['gen-ans'], log: '✓ guidance back to the SME' },
    ],
  ],
};

// Stack radar: one axis per area, plotted by how many tools the résumé lists for it.
export const stack = [
  { id: 'backend', label: 'Backend', items: ['Python', 'FastAPI', 'REST APIs', 'Pydantic', 'SQLAlchemy'] },
  { id: 'agents', label: 'Agents', items: ['LangGraph', 'LangChain', 'DeepAgents', 'LangSmith', 'MCP', 'Agent Skills'] },
  { id: 'rag', label: 'RAG & LLMOps', items: ['RAG pipelines', 'Retrieval optimisation', 'Hybrid search', 'Reranking', 'Chunking strategies', 'Context management', 'LLM evaluation', 'Observability', 'Guardrails', 'Jailbreak detection'] },
  { id: 'ml', label: 'ML / DL', items: ['PyTorch', 'Transformers', 'HuggingFace', 'Fine-tuning', 'Ragas evals', 'DeepEval', 'LLM benchmarking'] },
  { id: 'data', label: 'Data', items: ['PostgreSQL + PGVector', 'ChromaDB', 'DuckDB', 'ClickHouse', 'SQLite', 'Redis', 'DiskCache', 'Neo4j', 'Databricks Delta'] },
  { id: 'cloud', label: 'Cloud & DevOps', items: ['Azure', 'Azure AI Foundry', 'Azure DevOps CI/CD', 'Docker', 'Kubernetes', 'Helm', 'Nginx'] },
  { id: 'perf', label: 'Concurrency', items: ['AsyncIO', 'Multithreading', 'Multiprocessing', 'Parallel processing'] },
  { id: 'test', label: 'Testing', items: ['PyTest', 'FastAPI TestClient', 'Selenium', 'Locust'] },
];

export const dailyTools = ['VS Code', 'Postman', 'GitHub', 'Jupyter', 'Docker Desktop', 'GitHub Copilot', 'Claude', 'ChatGPT'];

// Corridor windows. `file` + `code` are drawn onto the floating 3D window; the rest is the readable card.
export const projects = [
  {
    id: 'ragas',
    code: 'SYS-01',
    tag: 'Knowledge infrastructure',
    when: '2025 →',
    title: 'RAGAS',
    subtitle: 'RAG as a Service',
    blurb: 'An enterprise RAG platform, so internal apps stop rebuilding their own pipelines: centralised ingestion and retrieval APIs for any document, from any source.',
    stats: [['9s → 4s', 'LLM latency'], ['+35%', 'throughput'], ['2–3×', 'retrieval consistency'], ['30+', 'teams onboarded']],
    details: [
      'Parser suite for documents, images, spreadsheets, slides, logs, markdown and email.',
      'Semantic, recursive, paragraph-, page-, table-aware, multimodal and email chunking.',
      'SelfQuery, MultiQuery, Ensemble, Compression, Structured-Data and Agentic retrievers.',
      'Connectors for SharePoint, Jira, Confluence, ServiceNow, Box and Azure Blob.',
    ],
    stack: ['Python', 'FastAPI', 'LangChain', 'PGVector', 'Azure Form Recognizer'],
    file: 'ragas/platform.py',
    source: `# RAGAS — RAG as a Service
# One platform, so apps stop rebuilding pipelines.

kb = KnowledgeBase(
    connectors=["sharepoint", "jira", "confluence",
                "servicenow", "box", "azure_blob"],
    parsers=["pdf", "docx", "xlsx", "pptx", "email",
             "image", "logs", "markdown"],
    chunking="semantic",   # recursive | page | table
    retriever="ensemble",  # self_query | agentic
)

hits = kb.retrieve(question, top_k=8)

# latency 9s -> 4s · throughput +35% · 30+ teams`,
  },
  {
    id: 'dea',
    code: 'SYS-02',
    tag: 'Multi-agent orchestration',
    when: '2025 →',
    title: 'Data Exploration Agent',
    subtitle: 'Agents that map data',
    blurb: 'A multi-agent system for source-to-target schema mapping. Agents research the target schema, explore the source data and validate every recommendation before an SME sees it.',
    stats: [['80%+', 'mapping accuracy'], ['6–8 mo → 2–3 wk', 'turnaround'], ['4', 'specialised agents']],
    details: [
      'Researcher: RAG over target-schema docs, with references for every recommendation.',
      'EDA: generates, validates and executes SQL queries and Python code.',
      'General: data-model questions and process clarifications.',
      'Validator: checks correctness, consistency and data-model rules; flags mismatches.',
    ],
    stack: ['LangGraph', 'DeepAgents', 'RAG', 'SQL', 'Python'],
    file: 'dea/graph.py',
    source: `# Data Exploration Agent — multi-agent mapping

graph = StateGraph(MappingState)

graph.add_node("researcher", researcher)  # RAG
graph.add_node("eda", eda_agent)          # SQL + Python
graph.add_node("general", general_agent)  # Q&A
graph.add_node("validator", validator)    # rules

graph.add_conditional_edges(START, route)
for agent in ("researcher", "eda"):
    graph.add_edge(agent, "validator")
graph.add_edge("validator", END)
graph.add_edge("general", END)

# accuracy 80%+ · 6–8 months -> 2–3 weeks`,
  },
  {
    id: 'obs',
    code: 'SYS-03',
    tag: 'Observability',
    when: 'Now',
    title: 'AI Observability Platform',
    subtitle: 'See every token',
    blurb: 'Enterprise-wide, centralised tracing, evaluation and alerting for LLM applications — instrument an app once and it shows up on the dashboards.',
    stats: [['12+', 'microservices'], ['1–2 min', 'trace → dashboard'], ['Org-wide', 'LLM telemetry']],
    details: [
      '12+ FastAPI microservices running on Kubernetes.',
      'OpenTelemetry-based distributed tracing and a custom LLM auto-instrumentation SDK.',
      'KPI and evaluation services, alerting, real-time telemetry via Azure EventHub and Arize AI.',
      'Databricks + ClickHouse analytics behind near real-time dashboards.',
    ],
    stack: ['FastAPI', 'Kubernetes', 'OpenTelemetry', 'ClickHouse', 'Databricks', 'Arize AI'],
    file: 'observability/instrument.py',
    source: `# Enterprise AI Observability — see every token

observe.init(
    service="your-llm-app",
    exporter="otlp",          # OpenTelemetry traces
    stream="azure_eventhub",  # real-time telemetry
    sinks=["clickhouse", "databricks", "arize"],
    kpis=True,
    evals=True,
    alerts=True,
)

@observe.llm  # auto-instrumentation SDK
def answer(question): ...

# 12+ FastAPI services on k8s · 1–2 min to dash`,
  },
  {
    id: 'rai',
    code: 'SYS-04',
    tag: 'Safety & governance',
    when: '2024',
    title: 'RAI SDK',
    subtitle: 'Responsible AI gateway',
    blurb: 'One API in front of every LLM provider, with jailbreak detection, guardrails and PII masking built into the request path. Runs as a shared service across projects.',
    stats: [['Regex + BERT', 'jailbreak detection'], ['Runtime', 'config, no redeploy'], ['Shared', 'service, cross-org']],
    details: [
      'Hybrid jailbreak detection: regex rules plus a fine-tuned BERT classifier.',
      'Context-aware guardrails block toxic and off-topic output; PII masking.',
      'Power Proxy routes across Azure LLM backends by cost, latency and token limits.',
      'Per-client Grafana dashboards and automated evaluation pipelines.',
    ],
    stack: ['Python', 'Fine-tuned BERT', 'Azure OpenAI', 'Grafana'],
    file: 'rai_sdk/client.py',
    source: `# RAI SDK — one API in front of every LLM

client = RAIClient(app="ssgenai")

reply = client.chat(
    messages=messages,
    model="auto",             # power proxy:
                              # cost · latency · tokens
    guardrails="org-policy",  # toxic / off-topic
    jailbreak="regex+bert",   # fine-tuned BERT
    pii="mask",
)

# thresholds + models change at runtime
# per-client Grafana: latency · errors · tokens`,
  },
  {
    id: 'ssgenai',
    code: 'SYS-05',
    tag: 'Enterprise copilot',
    when: '2024 →',
    title: 'SSGenAI',
    subtitle: 'Self-service copilot (formerly SSGPT)',
    blurb: 'A self-service copilot platform where teams build their own LLM apps — DomainQA, document RAG and Questionnaire — behind Azure AD roles.',
    stats: [['99.9%', 'uptime'], ['20+', 'teams'], ['3', 'app types']],
    details: [
      'Runtime choice of chat and embedding models through the RAI SDK, with guardrails and PII masking.',
      'RBAC (Super Admin / Admin / User) backed by Azure AD groups.',
      'Began with its own PGVector pipeline with citations and PDF highlighting; retrieval now runs on RAGAS.',
      'Targeted caching on hot paths; Helm deploys DEV → UAT → PROD through Azure Pipelines.',
    ],
    stack: ['Azure AD', 'RAI SDK', 'RAGAS', 'PGVector', 'Helm', 'Azure Pipelines'],
    file: 'ssgenai/app.yaml',
    source: `# SSGenAI (formerly SSGPT) — self-service copilot

app:
  type: rag                # domain_qa | rag | questionnaire
  chat_model: runtime      # picked via RAI SDK
  embeddings: open_source  # less OpenAI spend
  retrieval: ragas
  safety: [guardrails, jailbreak, pii_masking]

access:
  provider: azure_ad
  roles: [super_admin, admin, user]

deploy: [dev, uat, prod]   # Helm via Azure Pipelines
# 99.9% uptime · 20+ teams`,
  },
];

// Knowledge base for the in-browser "ask" console. Plain keyword retrieval — no LLM, no server.
export const knowledge = [
  {
    id: 'role', source: 'résumé · summary',
    keys: ['who', 'role', 'job', 'work', 'experience', 'years', 'state', 'street', 'current', 'title', 'about', 'yourself', 'introduce', 'hi', 'hello', 'hey', 'giri'],
    text: "I'm an Agentic AI Engineer (Senior Associate) at State Street, where I've worked since January 2024 — nearly three years. I build Python backends and LLM systems: RAG platforms, multi-agent orchestration, guardrails and AI observability. I've taken PoCs to production and onboarded 50+ teams at 99.9% uptime.",
  },
  {
    id: 'ragas', source: 'résumé · RAGAS',
    keys: ['ragas', 'rag', 'platform', 'ingestion', 'parser', 'parsing', 'chunk', 'chunking', 'connector', 'connectors', 'sharepoint', 'confluence', 'jira', 'servicenow', 'latency', 'throughput', 'service', 'fast', 'faster', 'speed', 'performance', 'impact'],
    text: 'RAGAS is the enterprise RAG platform I built: centralised ingestion and retrieval APIs, a parser suite for documents, images, spreadsheets, slides, logs and emails, seven chunking strategies, and connectors for SharePoint, Jira, Confluence, ServiceNow, Box and Azure Blob. It cut LLM inference latency from 9s to 4s, raised throughput by 35%, and onboarded 30+ internal teams.',
  },
  {
    id: 'retrievers', source: 'résumé · RAGAS retrieval',
    keys: ['retriever', 'retrievers', 'retrieval', 'search', 'hybrid', 'rerank', 'reranking', 'selfquery', 'multiquery', 'ensemble', 'compression', 'vector', 'pgvector', 'embedding', 'embeddings', 'consistency'],
    text: 'For retrieval I implemented SelfQuery, MultiQuery, Naive, Contextual Compression, Ensemble, Structured Data and Agentic retrievers on PGVector, plus hybrid search and reranking. That work improved retrieval resiliency and consistency by 2–3×.',
  },
  {
    id: 'dea', source: 'résumé · Data Exploration Agent',
    keys: ['agent', 'agents', 'agentic', 'multi', 'multiagent', 'orchestration', 'exploration', 'dea', 'schema', 'mapping', 'eda', 'sql', 'researcher', 'langgraph', 'deepagents'],
    text: 'The Data Exploration Agent is a multi-agent system for source-to-target schema mapping. A Researcher agent uses RAG over target-schema docs, an EDA agent writes and runs SQL and Python against the source data, a General agent answers process questions, and a Validator agent checks the result. It reaches 80%+ mapping accuracy and turns 6–8 month manual workflows into 2–3 weeks.',
  },
  {
    id: 'validation', source: 'résumé · DEA validator',
    keys: ['validate', 'validator', 'validation', 'hallucinate', 'hallucination', 'hallucinating', 'grounded', 'grounding', 'correct', 'correctness', 'trust', 'reliable', 'reliability', 'verify', 'quality', 'accuracy'],
    text: "Agents don't grade their own homework. In the Data Exploration Agent a dedicated Validator agent reviews the Researcher and EDA output for correctness, consistency and alignment with the target data-model rules, and flags mismatches instead of passing them on. Every recommendation also carries its references.",
  },
  {
    id: 'obs', source: 'résumé · AI Observability',
    keys: ['observability', 'monitoring', 'tracing', 'trace', 'traces', 'opentelemetry', 'otel', 'telemetry', 'clickhouse', 'databricks', 'dashboard', 'dashboards', 'metrics', 'kubernetes', 'microservices', 'arize', 'eventhub', 'alerting'],
    text: 'I built an enterprise-wide AI observability platform: 12+ FastAPI microservices on Kubernetes, OpenTelemetry tracing, a custom LLM auto-instrumentation SDK, KPI and evaluation services, alerting, and real-time telemetry through Azure EventHub and Arize AI, with Databricks + ClickHouse analytics. Dashboards update within 1–2 minutes.',
  },
  {
    id: 'rai', source: 'résumé · RAI SDK',
    keys: ['guardrail', 'guardrails', 'jailbreak', 'safety', 'security', 'pii', 'responsible', 'rai', 'sdk', 'bert', 'injection', 'routing', 'proxy', 'provider', 'providers', 'gateway', 'grafana'],
    text: 'The RAI SDK puts one API in front of multiple LLM providers. It has hybrid jailbreak detection (regex plus a fine-tuned BERT model), context-aware guardrails, PII masking, and a Power Proxy that routes requests across Azure backends by cost, latency and token limits. Models and thresholds change at runtime without a redeploy, and every client gets Grafana dashboards.',
  },
  {
    id: 'ssgenai', source: 'résumé · SSGenAI',
    keys: ['ssgenai', 'ssgpt', 'copilot', 'chatbot', 'self', 'rbac', 'azure', 'ad', 'questionnaire', 'domainqa', 'uptime', 'helm', 'deploy', 'deployment', 'caching', 'cache'],
    text: 'SSGenAI (formerly SSGPT) is a self-service enterprise copilot where teams build DomainQA, document-RAG and Questionnaire apps. It has multi-model orchestration through the RAI SDK, Azure AD role-based access, guardrails and PII masking, with retrieval served by RAGAS. I shipped it DEV → UAT → PROD with Helm through Azure Pipelines; it runs at 99.9% uptime across 20+ teams.',
  },
  {
    id: 'stack', source: 'résumé · skills',
    keys: ['stack', 'skills', 'skill', 'tech', 'technology', 'technologies', 'tools', 'language', 'languages', 'python', 'framework', 'frameworks', 'fastapi', 'langchain', 'pytorch', 'docker', 'database', 'databases', 'use'],
    text: 'My core stack: Python and FastAPI; LangGraph, LangChain, DeepAgents and LangSmith for agents; PyTorch, Transformers and HuggingFace for models; Ragas and DeepEval for evaluation; PostgreSQL/PGVector, ChromaDB, DuckDB, ClickHouse, Redis and Neo4j for data; Azure, Docker, Kubernetes and Helm to ship it.',
  },
  {
    id: 'edu', source: 'résumé · education',
    keys: ['education', 'degree', 'college', 'university', 'gitam', 'cgpa', 'gpa', 'study', 'studied', 'certification', 'certifications', 'certified', 'az', 'ai900', 'az900', 'graduate'],
    text: "I studied Computer Science and Engineering with a Data Science specialisation at GITAM University (2020–2024) and graduated with a 9.19/10 CGPA. I hold Microsoft's Azure AZ-900 and AI-900 certifications.",
  },
  {
    id: 'contact', source: 'résumé · header',
    keys: ['contact', 'email', 'mail', 'reach', 'hire', 'hiring', 'connect', 'linkedin', 'talk', 'available', 'location', 'where', 'based', 'opportunity', 'opportunities', 'resume', 'cv'],
    text: "Email is best — girisainath15@gmail.com — or LinkedIn at linkedin.com/in/girisainath. I'm based in Telangana, India (IST, UTC+5:30). The full résumé PDF is linked at the top of the page.",
  },
];

export const suggestions = [
  'What do you do at State Street?',
  'What is RAGAS?',
  'How do your agents avoid hallucinating?',
  "What's your stack?",
  'How do I reach you?',
];

export const contactTopics = ['A role or opportunity', 'A project collaboration', 'RAG / agents talk', 'Just saying hi'];
