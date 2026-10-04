"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/client";

type Settings = { siteName: string; logo: string; copyright: string; announcement: string };

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({ siteName: "", logo: "", copyright: "", announcement: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetchJson<Settings>("/api/admin/settings");
      if (res.ok && res.data) setSettings(res.data);
      else toast.error(res.error || "加载失败");
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (saving) return;
    setSaving(true);
    const res = await fetchJson("/api/admin/settings", { method: "PUT", json: settings });
    setSaving(false);
    if (res.ok) toast.success("设置已保存");
    else toast.error(res.error || "保存失败");
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">系统设置</h1><p className="text-muted-foreground">自定义网站基本信息</p></div>
        <Button className="rounded-xl gap-1" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}保存
        </Button>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle className="text-lg">基本信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>网站名称</Label><Input className="rounded-xl" value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} /></div>
            <div className="space-y-2"><Label>Logo URL</Label><Input className="rounded-xl" placeholder="https://..." value={settings.logo} onChange={(e) => setSettings({ ...settings, logo: e.target.value })} /></div>
            <div className="space-y-2"><Label>版权信息</Label><Input className="rounded-xl" value={settings.copyright} onChange={(e) => setSettings({ ...settings, copyright: e.target.value })} placeholder="© 2026 点名宝" /></div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader><CardTitle className="text-lg">系统公告</CardTitle><CardDescription>显示在教师端仪表盘顶部，留空则不显示</CardDescription></CardHeader>
          <CardContent>
            <Textarea className="rounded-xl min-h-24" value={settings.announcement} onChange={(e) => setSettings({ ...settings, announcement: e.target.value })} placeholder="输入公告内容..." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
