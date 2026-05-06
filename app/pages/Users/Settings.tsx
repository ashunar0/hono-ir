import { useForm } from "@inertiajs/react";
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
    <>
      <h1>Your Settings</h1>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          form.put("/user");
        }}
        className="max-w-md flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            URL of profile picture
            <input
              type="text"
              value={form.data.image}
              onChange={(e) => form.setData("image", e.target.value)}
              className="block w-full px-2 py-1"
            />
          </label>
          {form.errors.image && (
            <p className="m-0 text-[red] text-sm">{form.errors.image}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            Your name
            <input
              type="text"
              value={form.data.username}
              onChange={(e) => form.setData("username", e.target.value)}
              className="block w-full px-2 py-1"
            />
          </label>
          {form.errors.username && (
            <p className="m-0 text-[red] text-sm">{form.errors.username}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            Short bio about you
            <textarea
              value={form.data.bio}
              onChange={(e) => form.setData("bio", e.target.value)}
              rows={5}
              className="block w-full px-2 py-1"
            />
          </label>
          {form.errors.bio && (
            <p className="m-0 text-[red] text-sm">{form.errors.bio}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            Email
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
            New password (leave blank to keep current)
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
          Update Settings
        </button>
      </form>
    </>
  );
}
