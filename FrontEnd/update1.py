import re
import os

# 1. Update LivePage.tsx
live_page_path = r"e:\faculty\grad_project\FakeNewsDetection\FrontEnd\src\pages\LivePage.tsx"
with open(live_page_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add Maximize import
content = content.replace("Radio, Play, Wifi, WifiOff,", "Radio, Play, Wifi, WifiOff, Maximize,")

# Add Fullscreen button to Video Player
video_mount_target = """                    {/* WebRTC Video Mount */}
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className={cn("w-full h-full object-cover transition-opacity duration-500", isWatching ? "opacity-100" : "opacity-0")}
                    />"""

video_mount_replacement = """                    {/* WebRTC Video Mount */}
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className={cn("w-full h-full object-cover transition-opacity duration-500", isWatching ? "opacity-100" : "opacity-0")}
                    />
                    
                    {/* Fullscreen Button */}
                    <div className="absolute top-4 right-4 z-30 pointer-events-auto opacity-0 hover:opacity-100 group-hover/video:opacity-100 transition-opacity">
                      <button 
                        onClick={() => remoteVideoRef.current?.requestFullscreen()}
                        className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                        title="Fullscreen"
                      >
                        <Maximize className="w-4 h-4" />
                      </button>
                    </div>"""

# Ensure the parent div has group/video to show fullscreen on hover
parent_div_target = """                  <div className="aspect-video w-full flex items-center justify-center relative bg-black/50">"""
parent_div_replacement = """                  <div className="group/video aspect-video w-full flex items-center justify-center relative bg-black/50">"""

content = content.replace(video_mount_target, video_mount_replacement)
content = content.replace(parent_div_target, parent_div_replacement)

# Delete Source Verification Info and Metadata sections
import re
pattern = r'\{\/\* Source Verification Info \*\/\}[\s\S]*?(?=\{\/\* Related Intel Grid)'
content = re.sub(pattern, "", content)

# Fix chat append locally
chat_append_target = """  const handleSendComment = async () => {
    const text = chatInput.trim();
    if (!text || !activeStream?.liveId) return;
    await sendComment(activeStream.liveId, text);
    setChatInput("");
  };"""

chat_append_replacement = """  const handleSendComment = async () => {
    const text = chatInput.trim();
    if (!text || !activeStream?.liveId) return;
    await sendComment(activeStream.liveId, text);
    appendUniqueMessage(user?.name || "Viewer", text);
    setChatInput("");
  };"""

content = content.replace(chat_append_target, chat_append_replacement)

# Update Chat Avatar
chat_avatar_target = """                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">{msg.senderName.charAt(0).toUpperCase()}</span>
                            </div>"""

chat_avatar_replacement = """                            <img
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.senderName)}`}
                                alt={msg.senderName}
                                className="w-8 h-8 rounded-full border border-primary/20 flex items-center justify-center flex-shrink-0 object-cover"
                            />"""

content = content.replace(chat_avatar_target, chat_avatar_replacement)

with open(live_page_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated LivePage.tsx")


# 2. Update LiveWatchPage.tsx
live_watch_path = r"e:\faculty\grad_project\FakeNewsDetection\FrontEnd\src\pages\LiveWatchPage.tsx"
with open(live_watch_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("Radio, Users, MessageSquare, Send, User,", "Radio, Users, MessageSquare, Send, User, Maximize,")

video_mount_target_watch = """          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full max-w-5xl aspect-video rounded-2xl object-cover bg-zinc-900 border border-white/10"
          />"""

video_mount_replacement_watch = """          <div className="relative w-full max-w-5xl aspect-video group/video">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full rounded-2xl object-cover bg-zinc-900 border border-white/10"
            />
            {/* Fullscreen Button */}
            <div className="absolute top-4 right-4 z-30 pointer-events-auto opacity-0 hover:opacity-100 group-hover/video:opacity-100 transition-opacity">
              <button 
                onClick={() => remoteVideoRef.current?.requestFullscreen()}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>"""

content = content.replace(video_mount_target_watch, video_mount_replacement_watch)

chat_append_target_watch = """  const handleSendComment = async () => {
    const text = chatInput.trim();
    if (!text || !liveId) return;

    await sendComment(liveId, text);
    setChatInput("");
  };"""

chat_append_replacement_watch = """  const handleSendComment = async () => {
    const text = chatInput.trim();
    if (!text || !liveId) return;

    await sendComment(liveId, text);
    appendUniqueMessage(user?.name || "Viewer", text);
    setChatInput("");
  };"""

content = content.replace(chat_append_target_watch, chat_append_replacement_watch)

chat_avatar_watch_target = """                    <div key={i} className="space-y-0.5">
                      <p className="text-xs font-semibold text-accent">
                        {msg.senderName}
                      </p>
                      <p className="text-sm text-white/80 leading-snug">{msg.text}</p>
                    </div>"""

chat_avatar_watch_replacement = """                    <div key={i} className="flex items-start gap-2">
                      <img
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.senderName)}`}
                        alt={msg.senderName}
                        className="w-6 h-6 rounded-full border border-white/10 object-cover mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-accent">
                          {msg.senderName}
                        </p>
                        <p className="text-sm text-white/80 leading-snug">{msg.text}</p>
                      </div>
                    </div>"""

content = content.replace(chat_avatar_watch_target, chat_avatar_watch_replacement)

with open(live_watch_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated LiveWatchPage.tsx")

