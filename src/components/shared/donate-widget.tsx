"use client";

import { useState } from "react";
import { Heart, X } from "lucide-react";

export function DonateWidget() {
  const [show, setShow] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {show && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-200 bg-white rounded-2xl shadow-lg border border-border p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">赞赏支持</span>
            <button
              onClick={() => setShow(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <img
            src="/donate-qr.png"
            alt="赞赏码"
            className="w-full rounded-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <p className="text-xs text-muted-foreground text-center mt-2">
            如果点名宝帮到了你
          </p>
        </div>
      )}
      <button
        onClick={() => setShow(!show)}
        className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-all ${
          show
            ? "bg-muted text-muted-foreground"
            : "bg-white text-rose-600 border border-border hover:shadow-xl hover:scale-105"
        }`}
      >
        <Heart className={`h-4 w-4 ${show ? "" : "fill-rose-500 text-rose-500"}`} />
        {show ? "收起" : "赞赏"}
      </button>
    </div>
  );
}
