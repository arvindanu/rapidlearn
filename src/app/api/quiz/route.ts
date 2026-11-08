import { NextResponse } from "next/server";
import type { QuizQuestion } from "@/lib/types";

export async function GET() {
  try {
    const response = await fetch(
      "https://opentdb.com/api.php?amount=10&type=multiple&encode=url3986",
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Quiz API request failed");
    }

    const data = await response.json();

    if (data.response_code === 5) {
      return NextResponse.json(
        { error: "Quiz limit reached. Please wait a few seconds." },
        { status: 429 }
      );
    }

    if (data.response_code !== 0) {
      throw new Error("No quiz questions available");
    }

    const decode = (value: string) => decodeURIComponent(value);

    const questions: QuizQuestion[] = data.results.map(
      (item: Record<string, string | string[]>) => ({
        question: decode(item.question as string),
        correct_answer: decode(item.correct_answer as string),
        incorrect_answers: (item.incorrect_answers as string[]).map(decode),
        category: decode(item.category as string),
        difficulty: item.difficulty as string,
      })
    );

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Quiz API error:", error);

    return NextResponse.json(
      { error: "Unable to load the quiz. Please try again shortly." },
      { status: 500 }
    );
  }
}