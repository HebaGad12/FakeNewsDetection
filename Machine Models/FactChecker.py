# To run this code you need to install the following dependencies:
# pip install google-genai

import base64
import os
from google import genai
from google.genai import types


class FactChecker:
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model
        self.client = genai.Client(api_key=self.api_key)

    def check(self, article: str) -> str:
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=f"""
You are a professional fact-checker.

Verify whether the following article contains real and accurate news.

Instructions:
- Use Google Search to verify factual claims.
- Rely only on official and highly reputable sources (government websites, Reuters, AP, BBC, official company statements, peer-reviewed research).
- Focus only on verifiable factual claims, not opinions.
- If major claims are false, misleading, or unsupported → answer NO.
- If claims are supported by reliable sources → answer YES.

Provide a short analysis (3–6 sentences).

The last line of your response must be only:
true
or
false

Do not write anything after true or false.

Article:
{article}
"""),
                ],
            ),
        ]
        tools = [
            types.Tool(googleSearch=types.GoogleSearch()),
        ]
        generate_content_config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                thinking_budget=-1,
            ),
            tools=tools,
        )

        result = ""
        for chunk in self.client.models.generate_content_stream(
            model=self.model,
            contents=contents,
            config=generate_content_config,
        ):
            if chunk.text:
                result += chunk.text
                print(chunk.text, end="")

        print()
        return result


if __name__ == "__main__":
    key = os.getenv("GEMINI_API_KEY")
    article = """iran is bombing gulf countries"""

    checker = FactChecker(api_key=key)
    response = checker.check(article)
