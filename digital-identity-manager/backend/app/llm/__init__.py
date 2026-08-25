"""Optional LLM layer. The application never requires it."""

from app.llm.base import (
    CAPABILITIES,
    LLMDisabledError,
    LLMError,
    LLMProvider,
    LLMResult,
    Suggestion,
)
from app.llm.claude import ClaudeProvider
from app.llm.disabled import DisabledProvider
from app.llm.factory import IdentityAssistant, build_provider
from app.llm.minimization import MinimizationPolicy, context_hash, minimize
from app.llm.openai import OpenAIProvider

__all__ = [
    "CAPABILITIES",
    "ClaudeProvider",
    "DisabledProvider",
    "IdentityAssistant",
    "LLMDisabledError",
    "LLMError",
    "LLMProvider",
    "LLMResult",
    "MinimizationPolicy",
    "OpenAIProvider",
    "Suggestion",
    "build_provider",
    "context_hash",
    "minimize",
]
