import { useForm } from "@inertiajs/react";
import type { ArticleView } from "../../../src/features/articles/view";
import { FlashMessages } from "../../components/FlashMessages";
import { TagInput } from "../../components/TagInput";

type Props = { article: ArticleView };

export default function Edit({ article }: Props) {
  const form = useForm({
    title: article.title,
    description: article.description,
    body: article.body,
    tagList: article.tagList,
  });

  return (
    <main>
      <FlashMessages />
      <h1>Edit article</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.put(`/articles/${article.slug}`);
        }}
        className="max-w-md flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            title
            <input
              type="text"
              value={form.data.title}
              onChange={(e) => form.setData("title", e.target.value)}
              className="block w-full px-2 py-1"
            />
          </label>
          {form.errors.title && (
            <p className="m-0 text-[red] text-sm">{form.errors.title}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            description
            <input
              type="text"
              value={form.data.description}
              onChange={(e) => form.setData("description", e.target.value)}
              className="block w-full px-2 py-1"
            />
          </label>
          {form.errors.description && (
            <p className="m-0 text-[red] text-sm">{form.errors.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            body
            <textarea
              value={form.data.body}
              onChange={(e) => form.setData("body", e.target.value)}
              rows={10}
              className="block w-full px-2 py-1"
            />
          </label>
          {form.errors.body && (
            <p className="m-0 text-[red] text-sm">{form.errors.body}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label>tags</label>
          <TagInput
            value={form.data.tagList}
            onChange={(next) => form.setData("tagList", next)}
          />
          {form.errors.tagList && (
            <p className="m-0 text-[red] text-sm">{form.errors.tagList}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={form.processing}
          className="px-4 py-2 self-start"
        >
          Update
        </button>
      </form>
    </main>
  );
}
