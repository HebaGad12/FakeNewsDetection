import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, MessageCircle, UserCircle2 } from "lucide-react";
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <Header />

      <main className="max-w-[1000px] mx-auto px-6 py-12">
        <Button variant="ghost" className="mb-8 p-0 hover:bg-transparent tracking-widest text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
          &larr; Return
        </Button>

        {profile ? (
          <div>
            {/* Header Section */}
            <div className="mb-16">
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
                {profile.name}
              </h1>
              <p className="font-sans text-muted-foreground leading-relaxed max-w-2xl text-lg sm:text-xl">
                {profile.bio || "Investigative Contributor"}
                {profile.organization && ` â€¢ ${profile.organization}`}
              </p>
              <div className="flex flex-wrap gap-8 sm:gap-16 border-t border-border pt-6 mt-8">
                 <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Contributions</p>
                    <p className="font-display text-2xl">{profile.totalPosts}</p>
                 </div>
                 <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Network Base</p>
                    <p className="font-display text-2xl">{profile.followers || "0"}</p>
                 </div>
                 <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Authentication Check</p>
                    <p className="font-display text-2xl border-l-[3px] border-emerald-500 pl-3">Verified Source</p>
                 </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 sm:gap-16">
              <div className="md:col-span-8">
                 <h2 className="font-display text-2xl mb-8 text-foreground border-b border-border/50 pb-4">Filed Intelligence</h2>
                 
                 {profile.posts && profile.posts.length > 0 ? (
                   <div className="space-y-12">
                     {profile.posts.map(post => (
                        <div key={post.id} className="group">
                           <Link to={`/article/${post.id}`} className="block">
                             <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight group-hover:text-primary transition-colors hover:underline mb-3">
                               {post.title}
                             </h2>
                             <p className="font-sans text-muted-foreground leading-relaxed mb-4">
                               {post.content ? `${post.content.substring(0, 200)}...` : ""}
                             </p>
                             <div className="flex items-center gap-4 pt-3 mt-4 border-t border-border/30 opacity-70 group-hover:opacity-100 transition-opacity">
                               <span className="text-[10px] uppercase font-bold tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</span>
                               <span className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                 <MessageCircle className="w-3.5 h-3.5" /> {(post as any).comments?.length || post.comments || 0} Responses
                               </span>
                             </div>
                           </Link>
                        </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-sm text-muted-foreground border-l-2 border-muted pl-4">No field reports available for this operative yet.</p>
                 )}
              </div>
              
              {/* Profile Meta Sidebar */}
              <div className="md:col-span-4 space-y-8">
                  <div className="bg-card border border-border rounded-sm p-6">
                      <h4 className="font-sans text-xs font-bold text-muted-foreground mb-6 tracking-widest uppercase">Operative Data</h4>
                      <ul className="space-y-4">
                         <li className="flex justify-between items-center border-b border-border/50 pb-3">
                             <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">STATUS</span>
                             <span className="text-xs font-bold text-foreground tracking-widest">ACTIVE</span>
                         </li>
                         <li className="flex justify-between items-center border-b border-border/50 pb-3">
                             <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">CLEARANCE</span>
                             <span className="text-xs font-bold text-foreground uppercase tracking-widest">{profile.role || 'GUEST'}</span>
                         </li>
                         {typeof profile.totalJournalists === 'number' && profile.totalJournalists > 0 && (
                           <li className="flex justify-between items-center border-b border-border/50 pb-3">
                               <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">PERSONNEL</span>
                               <span className="text-xs font-bold text-foreground uppercase tracking-widest">{profile.totalJournalists}</span>
                           </li>
                         )}
                         <li className="flex justify-between items-center">
                             <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">JOINED</span>
                             <span className="text-xs font-bold text-foreground uppercase tracking-widest">{new Date(profile.memberSince).toLocaleDateString()}</span>
                         </li>
                      </ul>
                  </div>
              </div>
            </div>
          </div>
        ) : (
           <div className="text-center py-32 bg-card rounded-md border border-border/50">
              <UserCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-2xl font-semibold mb-2 text-foreground">Dossier Redacted</h2>
              <p className="text-muted-foreground text-sm font-sans tracking-wide">The operative data you are trying to access does not exist or has been removed.</p>
           </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PublicProfilePage;
