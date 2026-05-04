import { Link, router } from "@inertiajs/react";
import type { ProfileView } from "../../../src/features/profiles/view";
import { FlashMessages } from "../../components/FlashMessages";
import { useAuth } from "../../lib/use-auth";

type Props = { profile: ProfileView };

export default function Show({ profile }: Props) {
  const { user } = useAuth();
  const isLoggedIn = user !== null;

  return (
    <main>
      <FlashMessages />
      <article>
        {profile.image && (
          <img
            src={profile.image}
            alt={profile.username}
            style={{ width: 100, height: 100, borderRadius: "50%" }}
          />
        )}
        <h1>@{profile.username}</h1>
        {profile.bio && <p>{profile.bio}</p>}

        {profile.isSelf && (
          <p>
            <em>This is your profile.</em>
          </p>
        )}

        {isLoggedIn && !profile.isSelf && (
          <p>
            {profile.isFollowing ? (
              <button
                type="button"
                onClick={() =>
                  router.delete(`/profiles/${profile.username}/follow`)
                }
              >
                Unfollow @{profile.username}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  router.post(`/profiles/${profile.username}/follow`)
                }
              >
                Follow @{profile.username}
              </button>
            )}
          </p>
        )}
      </article>
      <p style={{ marginTop: "2rem" }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
