export interface SentimentModel {
  schema_version: number;
  preprocessing: string;
  labels: readonly string[];
  aliases: Record<string, string>;
  vocabulary: Record<string, number>;
  idf: readonly number[];
  weights: readonly (readonly number[])[];
  bias: readonly number[];
  algorithm: string;
  status: string;
}

export interface SentimentPrediction {
  label: string | null;
  status: "predicted" | "unknown_vocabulary" | "empty_input";
  scores: number[] | null;
  scoreType: "decision_margin" | "log_score" | "none";
  experimental: boolean;
}

export function createSentimentClassifier(model: SentimentModel): (text: string) => SentimentPrediction;
