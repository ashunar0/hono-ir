import { useForm } from "@inertiajs/react";

export default function Register() {
  const form = useForm({
    username: "",
    email: "",
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
          {form.errors.username && (
            <p style={{ color: "red" }}>{form.errors.username}</p>
          )}
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
          Sign up
        </button>
      </form>
    </main>
  );
}
