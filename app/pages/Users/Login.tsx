import { useForm } from "@inertiajs/react";

export default function Login() {
  const form = useForm({
    email: "",
    password: "",
  });

  return (
    <main>
      <h1>Sign in</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.post("/users/login");
        }}
      >
        <div>
          <label>
            email
            <input
              type="email"
              value={form.data.email}
              onChange={(e) => form.setData("email", e.target.value)}
            />
          </label>
          {form.errors.email && (
            <p style={{ color: "red" }}>{form.errors.email}</p>
          )}
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
          {form.errors.password && (
            <p style={{ color: "red" }}>{form.errors.password}</p>
          )}
        </div>
        <button type="submit" disabled={form.processing}>
          Sign in
        </button>
      </form>
    </main>
  );
}
