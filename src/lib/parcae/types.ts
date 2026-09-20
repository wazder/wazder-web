export type QuestionType = 'choice' | 'multi' | 'scale' | 'text' | 'short';

export interface Question {
  id: string;
  q: string;
  t: QuestionType;
  /** choice / multi only */
  opts?: string[];
  /** scale only: labels for 1 and 5 */
  lo?: string;
  hi?: string;
  /** text / short only */
  ph?: string;
  /** shown under the question in smaller type */
  hint?: string;
  /** show the optional one-line "why" field once answered */
  note?: boolean;
}

export interface Section {
  id: string;
  no: string;
  title: string;
  lead: string;
  qs: Question[];
}

export interface Person {
  key: string;
  name: string;
  role: string;
}

export type AnswerMap = Record<string, { v?: string | string[]; n?: string }>;
