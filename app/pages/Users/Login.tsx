import { useForm } from "@inertiajs/react";
import { FlashMessages } from "../../components/FlashMessages";

export default function Login() {
  const form = useForm({
    email: "",
    password: "",
  });

  return (
    <main>
      <FlashMessages />
      <h1>Sign in</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.post("/users/login");
        }}
        className="max-w-md flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            email
            <input
              type="email"
              value={form.data.email}
              onChange={(e) => form.setData("email", e.target.value)}
              className="block w-full px-2 py-1"
            />
          </label>
          {form.errors.email && (
            <p className="m-0 text-[red] text-sm">{form.errors.email}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            password
            <input
              type="password"
              value={form.data.password}
              onChange={(e) => form.setData("password", e.target.value)}
              className="block w-full px-2 py-1"
            />
          </label>
          {form.errors.password && (
            <p className="m-0 text-[red] text-sm">{form.errors.password}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={form.processing}
          className="px-4 py-2 self-start"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
