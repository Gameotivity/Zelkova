"""RAG Retriever Tool — CrewAI tool for agents to query knowledge base."""
from __future__ import annotations

from crewai.tools import BaseTool

from hyperalpha.rag.knowledge_base import search_knowledge


class RetrieveStrategyKnowledgeTool(BaseTool):
    name: str = "retrieve_strategy_knowledge"
    description: str = (
        "Search the trading strategy knowledge base for relevant information. "
        "Query with topics like 'RSI divergence', 'risk management', "
        "'Bollinger squeeze', 'market regime', 'stop loss rules', etc. "
        "Returns the most relevant strategy documents."
    )

    def _run(self, query: str = "trading strategy") -> str:
        docs = search_knowledge(query, k=3)
        return "\n\n---\n\n".join(docs)


def get_rag_tools() -> list[BaseTool]:
    """Return RAG tools for CrewAI agents."""
    return [RetrieveStrategyKnowledgeTool()]
