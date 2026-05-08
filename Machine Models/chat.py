import os
from google import genai
from google.genai import types


class ChatAnalyzer:
    """
    Provides conversational grammar checking and fact-checking analysis
    using Gemini. Returns detailed analysis text — not a simple true/false.
    """

    MODES = ("grammar", "factcheck")

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model
        self.client = genai.Client(api_key=self.api_key)

    # ── Grammar check ────────────────────────────────────────────────────────

    def grammar_check(self, text: str) -> str:
        """
        Analyse the provided text for grammar, spelling, punctuation, and
        style issues. Returns a detailed, human-readable analysis.
        """
        prompt = f"""
You are an expert English editor and linguist.

Carefully analyse the following text for:
1. Grammar errors (subject-verb agreement, tense consistency, article use, etc.)
2. Spelling mistakes
3. Punctuation issues (commas, apostrophes, periods, etc.)
4. Clarity and style suggestions (wordiness, passive voice overuse, ambiguity)

For each issue found:
- Quote the problematic phrase or sentence.
- Explain what is wrong and why.
- Provide the corrected version.

If the text is already correct, say so clearly and briefly explain why it is well-written.

Respond in clear, plain English. Do NOT output JSON or bullet-point lists only —
write in a natural, editorial style as if you are giving feedback to a writer.

Text to analyse:
\"\"\"
{text}
\"\"\"
"""
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)],
            )
        ]
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=-1),
        )

        result = ""
        for chunk in self.client.models.generate_content_stream(
            model=self.model,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                result += chunk.text

        return result.strip()

    # ── Fact check (chat / analysis version) ────────────────────────────────

    def factcheck_analysis(self, text: str) -> str:
        """
        Perform a detailed fact-check analysis of the provided text using
        Google Search grounding. Returns a rich, human-readable report —
        NOT the binary true/false used by the original FactChecker class.
        """
        prompt = f"""
You are a senior investigative fact-checker working for a major news organisation.

Your job is to produce a thorough, readable fact-check report on the text below.

Instructions:
- Use Google Search to verify every significant factual claim.
- Only cite official, highly reputable sources (government websites, Reuters, AP,
  BBC, The Guardian, official company/institution statements, peer-reviewed research).
- For EACH major claim, state:
    • The claim as it appears in the text.
    • What you found when verifying it (evidence for or against).
    • Your verdict for that claim: ACCURATE / INACCURATE / UNVERIFIABLE / MISLEADING.
- After covering individual claims, write an overall summary paragraph.
- End with an overall verdict label on its own line, chosen from:
    ACCURATE | MOSTLY ACCURATE | MIXED | MOSTLY INACCURATE | INACCURATE | UNVERIFIABLE

Write in clear, journalistic prose. Do not use JSON. Do not be terse.

Text to fact-check:
\"\"\"
{text}
\"\"\"
"""
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)],
            )
        ]
        tools = [types.Tool(googleSearch=types.GoogleSearch())]
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=-1),
            tools=tools,
        )

        result = ""
        for chunk in self.client.models.generate_content_stream(
            model=self.model,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                result += chunk.text

        return result.strip()

    # ── Unified entry point ──────────────────────────────────────────────────

    def analyse(self, text: str, mode: str) -> str:
        """
        Run the requested analysis mode.

        Parameters
        ----------
        text : str
            The text to analyse.
        mode : str
            Either ``"grammar"`` or ``"factcheck"``.

        Returns
        -------
        str
            The full analysis report as plain text.

        Raises
        ------
        ValueError
            If ``mode`` is not one of the supported modes.
        """
        mode = mode.strip().lower()
        if mode == "grammar":
            return self.grammar_check(text)
        elif mode == "factcheck":
            return self.factcheck_analysis(text)
        else:
            raise ValueError(
                f"Unsupported mode '{mode}'. Choose from: {self.MODES}"
            )


# ── Quick smoke-test ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    key = os.getenv("GEMINI_API_KEY")
    analyzer = ChatAnalyzer(api_key=key)

    sample_grammar = "She go to school every days and brung her books with her."
    sample_fact = "The Eiffel Tower is located in Berlin and was built in 1950."

    print("=" * 60)
    print("GRAMMAR CHECK")
    print("=" * 60)
    print(analyzer.analyse(sample_grammar, mode="grammar"))

    print()
    print("=" * 60)
    print("FACT CHECK ANALYSIS")
    print("=" * 60)
    print(analyzer.analyse(sample_fact, mode="factcheck"))