export type Topic = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  category: string;
  source: string;
  url: string;
};

export type QuizQuestion = {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  category: string;
  difficulty: string;
};