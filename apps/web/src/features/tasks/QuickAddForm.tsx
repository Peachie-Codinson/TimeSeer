import { useState } from "react";
import { createTask } from "./api";

export function QuickAddForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createTask({ title: title.trim() });
      setTitle("");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        placeholder="Quick-add a task..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="input"
      />
      <button type="submit" disabled={submitting} className="btn-primary w-auto px-4">
        Add
      </button>
    </form>
  );
}
