import type { PassagePublic, QuestionPublic } from "../../lib/attemptTypes";
import { QuestionRenderer } from "./QuestionRenderer";

type Props = {
  passages: PassagePublic[];
  questions: QuestionPublic[];
  answers: Record<string, unknown>;
  onAnswerChange: (questionId: string, value: unknown) => void;
  disabled?: boolean;
};

/** FR-READ-02: passage and question panes side by side on desktop,
 * stacked on mobile (see .reading-pane in styles.css). */
export function ReadingPassagePane({ passages, questions, answers, onAnswerChange, disabled }: Props) {
  return (
    <div className="reading-pane">
      <div className="reading-pane-passages">
        {passages.map((passage) => (
          <div className="engine-passage" key={passage.id}>
            {passage.title && <h3>{passage.title}</h3>}
            {passage.body.split(/\n\s*\n/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ))}
      </div>

      <div className="reading-pane-questions">
        {questions.map((question) => (
          <QuestionRenderer
            key={question.id}
            question={question}
            value={answers[question.id]}
            onChange={(value) => onAnswerChange(question.id, value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
