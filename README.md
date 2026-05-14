# Long-Term Memory Domain Companion (Fitness Coach)

This project is a runnable demo of a long-term memory companion agent for a fitness coach scenario. It includes:
- Simulated long-term user conversations with preference changes and life events.
- Short-term memory (recent turns) and long-term memory (profile + vector-like retrieval).
- A case study script comparing responses with and without memory.

## Quick Start

```powershell
python -u app.py --demo --reset
```

Use the local model (GLM-4-main) if it is present:

```powershell
python -u app.py --demo --reset --use-llm
```

Use a specific dataset:

```powershell
python -u app.py --demo --reset --dataset data/datal.jsonl
```

One-click start (backend + frontend):

```powershell
.\start.ps1
```

Optional flags:

```powershell
.\start.ps1 -NoBrowser
.\start.ps1 -DryRun
```

Generate the case study report:

```powershell
python -u -m src.evaluation.evaluate
```

With a specific dataset:

```powershell
python -u -m src.evaluation.evaluate --dataset data/datal.jsonl
```

## API Server (Front-end Integration)

Run the FastAPI server:

```powershell
python -u -m uvicorn src.api.server:app --host 0.0.0.0 --port 8000
```

Health check:

```powershell
curl http://localhost:8000/api/health
```

Profile import example:

```powershell
curl -X PATCH http://localhost:8000/api/users/u_001/profile -H "Content-Type: application/json" -d "{\"profile\":{\"age\":\"26\",\"weight_kg\":\"62\"}}"
```

Memory list example:

```powershell
curl http://localhost:8000/api/users/u_001/memories
```

See `FRONTEND_API.md` for the full interface list.

## Project Structure

- `app.py`: Demo runner.
- `data/simulated_dialogues.jsonl`: Long-term interaction dataset.
- `data/datal.jsonl`: User-provided dataset (preferred if present).
- `data/dataset_template.jsonl`: Template for generating more dialogues.
- `reports/case_study.md`: Generated comparison report.
- `src/agent`: Companion agent and response generator.
- `src/memory`: Short-term and long-term memory modules.
- `src/data`: Dataset schema and generator.
- `FRONTEND_API.md`: Front-end integration API draft.

## Notes

This demo uses a lightweight local vector store implementation for similarity search and SQLite for structured user profiles. It is designed to be offline and dependency-free while remaining faithful to the long-term memory pipeline.

If you enable `--use-llm`, the project expects the model folder at `GLM-4-main` and requires dependencies from `requirements.txt`.

## Self-check Module Status
- Status: Not implemented yet (planned)
- Scope: data integrity checks, memory store consistency, and API health probes
