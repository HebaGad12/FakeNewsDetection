import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MessageCircle, ThumbsUp, UserCircle2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import publicProfileService, { PublicProfile } from "@/services/publicProfileService";
import { toast } from "sonner";

const PublicProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) {
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      try {
        const data = await publicProfileService.getProfile(id);
        setProfile(data);
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [id]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loadingProfile) {
    return <LoadingSpinner fullScreen message="Loading profile..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {profile ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <UserCircle2 className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile.role}
                    {profile.organization ? ` • ${profile.organization}` : ""}
                  </p>
                  {profile.bio && <p className="text-sm text-muted-foreground mt-3">{profile.bio}</p>}

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{profile.followers} followers</span>
                    <span>{profile.totalPosts} posts</span>
                    {typeof profile.totalJournalists === "number" && (
                      <span>{profile.totalJournalists} journalists</span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Member since {new Date(profile.memberSince).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Approved Posts</h2>
              {profile.posts.length > 0 ? (
                <div className="space-y-4">
                  {profile.posts.map((post) => (
                    <article key={post.id} className="rounded-lg border border-border p-4">
                      <h3 className="font-semibold text-foreground">{post.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-4">
                        {post.content}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="h-3.5 w-3.5" />
                          {post.likes}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {post.comments}
                        </span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No approved posts yet.</p>
              )}
            </section>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Profile not found.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PublicProfilePage;
