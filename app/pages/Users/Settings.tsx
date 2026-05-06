import { useForm } from "@inertiajs/react";
import { FlashMessages } from "../../components/FlashMessages";
import { useAuth } from "../../lib/use-auth";

export default function Settings() {
  const { user } = useAuth();

  // requireAuth 後の page なので user は必ず存在するが、hook の rules-of-hooks に従って
  // useForm を先に呼ぶ。初期値は user?.xxx で安全側に取る
  const form = useForm({
    image: user?.image ?? "",
    username: user?.username ?? "",
    bio: user?.bio ?? "",
    email: user?.email ?? "",
    password: "",
  });

  if (!user) return null;

  return (
    <main>
      <FlashMessages />
      <h1>Your Settings</h1>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          form.put("/user");
        }}
      >
        <div>
          <label>
            URL of profile picture
            <input
              type="text"
              value={form.data.image}
              onChange={(e) => form.setData("image", e.target.value)}
            />
          </label>
          {form.errors.image && (
            <p className="text-[red]">{form.errors.image}</p>
          )}
        </div>
        <div>
          <label>
            Your name
            <input
              type="text"
              value={form.data.username}
              onChange={(e) => form.setData("username", e.target.value)}
            />
          </label>
          {form.errors.username && (
            <p className="text-[red]">{form.errors.username}</p>
          )}
        </div>
        <div>
          <label>
            Short bio about you
            <textarea
              value={form.data.bio}
              onChange={(e) => form.setData("bio", e.target.value)}
              rows={5}
            />
          </label>
          {form.errors.bio && (
            <p className="text-[red]">{form.errors.bio}</p>
          )}
        </div>
        <div>
          <label>
            Email
            <input
              type="email"
              value={form.data.email}
              onChange={(e) => form.setData("email", e.target.value)}
            />
          </label>
          {form.errors.email && (
            <p className="text-[red]">{form.errors.email}</p>
          )}
        </div>
        <div>
          <label>
            New password (leave blank to keep current)
            <input
              type="password"
              value={form.data.password}
              onChange={(e) => form.setData("password", e.target.value)}
            />
          </label>
          {form.errors.password && (
            <p className="text-[red]">{form.errors.password}</p>
          )}
        </div>
        <button type="submit" disabled={form.processing}>
          Update Settings
        </button>
      </form>
    </main>
  );
}
