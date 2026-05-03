import { useForm } from "@inertiajs/react";
import type { RegisterPageProps } from "../../../src/features/users";

export default function Register({ values, errors }: RegisterPageProps) {
  const form = useForm({
    username: values.username,
    email: values.email,
    password: "",
  });

  return (
    <main>
      <h1>Sign up</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.post("/users");
        }}
      >
        <div>
          <label>
            username
            <input
              type="text"
              value={form.data.username}
              onChange={(e) => form.setData("username", e.target.value)}
            />
          </label>
          {errors.username && <p style={{ color: "red" }}>{errors.username}</p>}
        </div>
        <div>
          <label>
            email
            <input
              type="email"
              value={form.data.email}
              onChange={(e) => form.setData("email", e.target.value)}
            />
          </label>
          {errors.email && <p style={{ color: "red" }}>{errors.email}</p>}
        </div>
        <div>
          <label>
            password
            <input
              type="password"
              value={form.data.password}
              onChange={(e) => form.setData("password", e.target.value)}
            />
          </label>
          {errors.password && <p style={{ color: "red" }}>{errors.password}</p>}
        </div>
        <button type="submit" disabled={form.processing}>
          Sign up
        </button>
      </form>
    </main>
  );
}
