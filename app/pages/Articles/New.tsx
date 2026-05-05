import { useForm } from "@inertiajs/react";
import { FlashMessages } from "../../components/FlashMessages";
import { TagInput } from "../../components/TagInput";

export default function New() {
  const form = useForm({
    title: "",
    description: "",
    body: "",
    tagList: [] as string[],
  });

  return (
    <main>
      <FlashMessages />
      <h1>New article</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.post("/articles");
        }}
      >
        <div>
          <label>
            title
            <input
              type="text"
              value={form.data.title}
              onChange={(e) => form.setData("title", e.target.value)}
            />
          </label>
          {form.errors.title && (
            <p style={{ color: "red" }}>{form.errors.title}</p>
          )}
        </div>
        <div>
          <label>
            description
            <input
              type="text"
              value={form.data.description}
              onChange={(e) => form.setData("description", e.target.value)}
            />
          </label>
          {form.errors.description && (
            <p style={{ color: "red" }}>{form.errors.description}</p>
          )}
        </div>
        <div>
          <label>
            body
            <textarea
              value={form.data.body}
              onChange={(e) => form.setData("body", e.target.value)}
              rows={10}
            />
          </label>
          {form.errors.body && (
            <p style={{ color: "red" }}>{form.errors.body}</p>
          )}
        </div>
        <div>
          <label>tags</label>
          <TagInput
            value={form.data.tagList}
            onChange={(next) => form.setData("tagList", next)}
          />
          {form.errors.tagList && (
            <p style={{ color: "red" }}>{form.errors.tagList}</p>
          )}
        </div>
        <button type="submit" disabled={form.processing}>
          Publish
        </button>
      </form>
    </main>
  );
}
