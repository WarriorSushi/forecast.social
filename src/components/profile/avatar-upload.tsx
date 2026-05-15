"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { setAvatarUrl, clearAvatar } from "@/server/actions/avatar";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUpload({
  userId,
  initialUrl,
  initialFallback,
}: {
  userId: string;
  initialUrl: string | null;
  initialFallback: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function pickFile() {
    fileRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so picking the same file again still fires onChange
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Max 2 MB.");
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast.error("JPEG, PNG, or WebP only.");
      return;
    }
    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        // Folder named after the user's UUID; the storage policy enforces this.
        const path = `${userId}/avatar-${Date.now()}.${ext}`;
        const upload = await supabase.storage
          .from("avatars")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) {
          toast.error(upload.error.message);
          return;
        }
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        const fd = new FormData();
        fd.set("url", data.publicUrl);
        const result = await setAvatarUrl(fd);
        if (result.status !== "ok") {
          toast.error(result.message);
          return;
        }
        setUrl(data.publicUrl);
        toast.success("Avatar updated.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  function handleClear() {
    startTransition(async () => {
      const result = await clearAvatar();
      if (result.status !== "ok") {
        toast.error(result.message);
        return;
      }
      setUrl(null);
      toast.success("Avatar removed.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-5">
      <Avatar className="size-16 rounded-md border border-border-strong">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="size-full object-cover rounded-md"
          />
        ) : (
          <AvatarFallback className="rounded-md bg-muted text-foreground font-display text-headline">
            {initialFallback}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={pickFile}
          >
            {pending ? "Uploading…" : url ? "Change" : "Upload"}
          </Button>
          {url ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={handleClear}
            >
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-caption text-muted-foreground">
          JPG, PNG, or WebP. Max 2 MB.
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
