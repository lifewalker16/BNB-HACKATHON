"""
Static skill prerequisite graph for 4 major roles.
Used as fallback when live scraper + vector DB both unavailable.
Each entry: list of (skill_name, duration_days, difficulty, project_task) tuples in dependency order.
"""

ROLE_SKILL_GRAPH = {
    "Cyber Security": [
        ("Linux Fundamentals",      5,  "Beginner",     "Set up a Kali Linux VM and navigate the filesystem"),
        ("Networking Basics (TCP/IP, DNS, HTTP)", 5, "Beginner", "Capture and analyze packets with Wireshark"),
        ("Python for Security Scripting", 7, "Beginner", "Write a port scanner in 50 lines of Python"),
        ("Web Application Security (OWASP Top 10)", 7, "Intermediate", "Complete DVWA challenges (SQLi, XSS, CSRF)"),
        ("SOC Analyst Tooling (SIEM, Splunk basics)", 5, "Intermediate", "Ingest sample logs into Splunk and create an alert"),
        ("Incident Response Playbook", 4, "Intermediate", "Write a 1-page IR plan for a ransomware scenario"),
        ("CTF Practice (TryHackMe / HackTheBox)", 7, "Advanced", "Complete one beginner room per day for a week"),
    ],
    "Frontend Developer": [
        ("HTML & CSS Fundamentals",  4, "Beginner",     "Build a personal portfolio page from scratch"),
        ("JavaScript ES6+",          7, "Beginner",     "Build a JavaScript quiz app with local storage"),
        ("React Fundamentals",       7, "Intermediate", "Build a weather app using a public API"),
        ("TypeScript Basics",        4, "Intermediate", "Convert your React app to TypeScript"),
        ("State Management (Redux / Zustand)", 4, "Intermediate", "Add global cart state to an e-commerce mock"),
        ("CSS Frameworks (Tailwind CSS)", 3, "Beginner", "Rebuild the portfolio page using Tailwind"),
        ("Testing (Jest + React Testing Library)", 4, "Advanced", "Write unit tests for your React components"),
        ("Next.js Fundamentals",     5, "Intermediate", "Convert the React app to a Next.js SSR app"),
    ],
    "DevOps Engineer": [
        ("Linux & Bash Scripting",   5, "Beginner",     "Write a backup script that runs on a cron job"),
        ("Docker & Containerization", 6, "Beginner",    "Containerize a Node.js app with multi-stage builds"),
        ("Git & GitHub Actions (CI/CD)", 5, "Intermediate", "Set up a GitHub Actions pipeline with test + build"),
        ("Kubernetes Basics",        7, "Intermediate", "Deploy a containerized app to a local minikube cluster"),
        ("Terraform Infrastructure as Code", 6, "Intermediate", "Provision an AWS EC2 instance using Terraform"),
        ("Monitoring (Prometheus + Grafana)", 5, "Advanced", "Set up dashboards for a deployed service"),
        ("Cloud Fundamentals (AWS / GCP)", 5, "Intermediate", "Complete AWS Cloud Practitioner exam prep"),
    ],
    "AI/ML Engineer": [
        ("Python & NumPy/Pandas",    5, "Beginner",     "Perform EDA on the Titanic dataset"),
        ("Statistics & Probability Basics", 4, "Beginner", "Implement linear regression from scratch"),
        ("Scikit-learn ML Pipeline", 6, "Intermediate", "Build a classification model with cross-validation"),
        ("Deep Learning with PyTorch", 7, "Intermediate", "Train a CNN on MNIST"),
        ("NLP Fundamentals (Transformers)", 7, "Advanced", "Fine-tune BERT for sentiment classification"),
        ("MLOps & Model Deployment", 5, "Advanced",    "Deploy a FastAPI model endpoint to Hugging Face"),
        ("LLM Prompting & RAG Systems", 5, "Advanced", "Build a RAG chatbot over a document corpus"),
    ],
    "Full Stack Developer": [
        ("HTML, CSS & JavaScript Basics", 5, "Beginner", "Build a static landing page"),
        ("React Fundamentals",       7, "Intermediate", "Build a CRUD todo app in React"),
        ("Node.js & Express REST API", 6, "Intermediate", "Build a REST API with user registration + JWT"),
        ("PostgreSQL & SQL",         5, "Intermediate", "Design a relational schema and run complex queries"),
        ("Docker Basics",            4, "Intermediate", "Dockerize the full-stack app with docker-compose"),
        ("TypeScript",               4, "Intermediate", "Convert the full stack to TypeScript"),
        ("Testing (Jest + Supertest)", 4, "Advanced",   "Write integration tests for all API endpoints"),
        ("Deployment (Vercel + Railway)", 3, "Intermediate", "Deploy the full stack to free cloud tiers"),
    ],
}

# Alias map: user input → canonical key
ROLE_ALIASES = {
    "cyber security":          "Cyber Security",
    "soc analyst":             "Cyber Security",
    "cybersecurity":           "Cyber Security",
    "frontend":                "Frontend Developer",
    "frontend developer":      "Frontend Developer",
    "web development":         "Frontend Developer",
    "devops":                  "DevOps Engineer",
    "devops engineer":         "DevOps Engineer",
    "cloud engineer":          "DevOps Engineer",
    "ai engineer":             "AI/ML Engineer",
    "ml engineer":             "AI/ML Engineer",
    "machine learning":        "AI/ML Engineer",
    "full stack":              "Full Stack Developer",
    "fullstack":               "Full Stack Developer",
    "backend developer":       "Full Stack Developer",
}

def resolve_role(user_input: str) -> str:
    """Normalize user role input to a canonical key."""
    normalized = user_input.strip().lower()
    return ROLE_ALIASES.get(normalized, user_input.title())
