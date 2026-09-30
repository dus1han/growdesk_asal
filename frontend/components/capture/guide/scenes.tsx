"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Search, UserPlus } from "lucide-react";
import { MockToolbar, type MockChip, type MockPicker, type MockTone } from "@/components/capture/mock-toolbar";
import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { BrowserFrame, Cursor, TypeText, usePhases } from "./stage";

export interface SceneProps {
  paused: boolean;
  onDone: () => void;
}

export interface GuideScene {
  title: string;
  text: string;
  Scene: (props: SceneProps) => React.ReactNode;
}

const NAME = "Sarah Fernando";
const NUMBER = "+971 50 123 4567";

/** The fields shown on the guide's toolbar (a real one shows whatever the admin enabled). */
function chips(values: Partial<Record<string, string>>): MockChip[] {
  return [
    { key: "name", label: "Name", required: true, value: values.name },
    { key: "whatsapp", label: "WhatsApp Number", required: true, value: values.whatsapp },
    { key: "treatments", label: "Interested Treatments", pick: true, value: values.treatments },
  ];
}

interface Toolbar {
  capturing: boolean;
  values?: Partial<Record<string, string>>;
  status?: string;
  tone?: MockTone;
  busy?: boolean;
  picker?: MockPicker | null;
  pressed?: string | null;
}

/** WhatsApp Web under the GrowDesk toolbar, with one incoming message to capture from. */
function WhatsAppPage({
  toolbar,
  highlight,
  menu,
  children,
}: {
  toolbar: Toolbar;
  highlight?: "name" | "number" | null;
  menu?: { on: "name" | "number"; hover: "root" | "item" | null; item: string; itemTarget: string } | null;
  children?: React.ReactNode;
}) {
  return (
    <BrowserFrame url="web.whatsapp.com">
      <MockToolbar
        capturing={toolbar.capturing}
        chips={chips(toolbar.values ?? {})}
        status={toolbar.status}
        tone={toolbar.tone}
        busy={toolbar.busy}
        picker={toolbar.picker}
        pressed={toolbar.pressed}
      />
      <div className="relative flex h-[440px] bg-[#efeae2]">
        <div className="w-[280px] shrink-0 space-y-1 border-r border-black/5 bg-white p-2">
          {["Sarah Fernando", "Omar H.", "Nadia", "+94 77 123 4567", "Clinic group"].map((n, i) => (
            <div key={n} className={cn("flex items-center gap-2.5 rounded-lg px-2 py-2.5", i === 0 && "bg-[#f0f2f5]")}>
              <span className={cn("size-9 shrink-0 rounded-full", ["bg-rose-200", "bg-sky-200", "bg-amber-200", "bg-emerald-200", "bg-violet-200"][i])} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[#111b21]">{n}</p>
                <div className="mt-1 h-1.5 w-2/3 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="flex h-12 items-center gap-3 border-b border-black/5 bg-[#f0f2f5] px-4">
            <span className="size-8 rounded-full bg-rose-200" />
            <p className="text-[13px] font-medium text-[#111b21]">Sarah Fernando</p>
          </div>
          <div className="p-6">
            <div className="max-w-[440px] rounded-lg rounded-tl-none bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-[#111b21] shadow-sm">
              Hi! I&apos;m <Selectable on={highlight === "name"} target="text-name" menu={menu?.on === "name" ? menu : null}>{NAME}</Selectable>. I&apos;d like to know
              more about Botox. My number is{" "}
              <Selectable on={highlight === "number"} target="text-number" menu={menu?.on === "number" ? menu : null}>
                {NUMBER}
              </Selectable>
              .
            </div>
            <div className="ml-auto mt-3 w-fit max-w-[300px] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3.5 py-2.5 text-[14px] text-[#111b21] shadow-sm">
              Thanks Sarah! Let me check that for you.
            </div>
          </div>
          {children}
        </div>
      </div>
    </BrowserFrame>
  );
}

/** Text that gets selected (a blue sweep) and, when asked, opens the right-click menu. */
function Selectable({
  on,
  target,
  menu,
  children,
}: {
  on: boolean;
  target: string;
  menu: { hover: "root" | "item" | null; item: string; itemTarget: string } | null;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-block">
      <motion.span
        data-target={target}
        className="bg-no-repeat"
        style={{ backgroundImage: "linear-gradient(#b3d4fc, #b3d4fc)" }}
        initial={false}
        animate={{ backgroundSize: on ? "100% 100%" : "0% 100%" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        {children}
      </motion.span>
      <AnimatePresence>
        {menu && (
          <motion.span
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="absolute left-[70%] top-[120%] z-40 flex items-start text-[12.5px] text-[#1c2430]"
          >
            <span className="block w-48 rounded-md border border-black/10 bg-white py-1 shadow-lg">
              <span className="block px-3 py-1.5 text-[#9aa3af]">Copy</span>
              <span className="block px-3 py-1.5 text-[#9aa3af]">Search Google for…</span>
              <span className="my-1 block h-px bg-black/10" />
              <span data-target="menu-root" className={cn("flex items-center justify-between px-3 py-1.5", menu.hover && "bg-[#e8f0fe]")}>
                <span className="flex items-center gap-1.5">
                  <LogoMark className="size-3.5" /> GrowDesk Capture
                </span>
                <ChevronRight className="size-3.5" />
              </span>
            </span>
            <AnimatePresence>
              {menu.hover && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="-ml-1 mt-[62px] block w-56 rounded-md border border-black/10 bg-white py-1 shadow-lg"
                >
                  {[
                    ["menu-name", "Set as Name"],
                    ["menu-whatsapp", "Set as WhatsApp Number"],
                    ["menu-instagram", "Set as Instagram"],
                  ].map(([t, label]) => (
                    <span key={t} data-target={t} className={cn("block px-3 py-1.5", menu.hover === "item" && t === menu.itemTarget && "bg-[#e8f0fe]")}>
                      {label}
                    </span>
                  ))}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// ---- 1. Connect ---------------------------------------------------------------------------------

function ConnectScene({ paused, onDone }: SceneProps) {
  const p = usePhases([700, 1300, 1400, 1300, 900, 450, 1600], { paused, onDone });
  return (
    <BrowserFrame url="chrome-extension://growdesk-capture/options.html">
      <div className="h-full bg-[#f6f7fb]">
        <div className="bg-gradient-to-r from-[#07071a] via-[#1a1a4a] to-[#0b3b3a] px-10 pb-16 pt-7 text-white">
          <div className="flex items-center gap-3">
            <LogoMark className="size-9" />
            <div>
              <p className="text-lg font-extrabold tracking-tight">GrowDesk Capture</p>
              <p className="text-xs text-white/60">Settings — opens the first time, or from the GrowDesk icon in Chrome</p>
            </div>
          </div>
        </div>
        <div className="mx-auto -mt-10 w-[560px] rounded-2xl border border-line bg-white p-6 shadow-card">
          <p className="text-sm font-semibold">Connect to GrowDesk</p>
          <p className="mt-0.5 text-xs text-muted">Copy these from GrowDesk → Administration → Capture Tool → Connections.</p>
          {[
            ["GrowDesk address", "https://crm.yourclinic.com", 1, false],
            ["Client ID", "gdc_4f9a2c81d07b3e65", 2, true],
            ["Client secret", "••••••••••••••••••••••••••••", 3, true],
          ].map(([label, value, at, mono]) => (
            <div key={label as string} className="mt-4">
              <p className="mb-1.5 text-xs font-semibold">{label}</p>
              <div className={cn("flex h-9 items-center rounded-lg border px-3 text-[13px]", p >= (at as number) ? "border-brand/40" : "border-line", mono && "font-mono text-[12px]")}>
                <TypeText text={value as string} start={p >= (at as number)} speed={label === "Client secret" ? 22 : 38} />
              </div>
            </div>
          ))}
          <div className="mt-5 flex items-center gap-3">
            <span
              data-target="save"
              className={cn(
                "rounded-lg bg-gradient-to-r from-[#7c7cff] to-brand px-4 py-2 text-[13px] font-bold text-white shadow-[0_8px_20px_-10px_rgb(91_91_246/0.9)] transition-transform",
                p === 5 && "scale-95",
              )}
            >
              Save &amp; connect
            </span>
            <span className="rounded-lg border border-line px-4 py-2 text-[13px] font-semibold">Test connection</span>
          </div>
          <AnimatePresence>
            {p >= 6 && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[13px] font-medium text-success"
              >
                <Check className="size-4" /> Connected as “Reception PC”. The toolbar will collect 5 fields.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Cursor target={p >= 4 ? "save" : null} click={p === 5} />
    </BrowserFrame>
  );
}

// ---- 2. Start -------------------------------------------------------------------------------------

function StartScene({ paused, onDone }: SceneProps) {
  const p = usePhases([700, 1100, 400, 2200], { paused, onDone });
  const capturing = p >= 3;
  return (
    <>
      <WhatsAppPage
        toolbar={{
          capturing,
          pressed: p === 2 ? "action" : null,
          status: capturing ? "Capturing: highlight text, right-click, then choose GrowDesk Capture." : undefined,
          tone: "success",
        }}
      />
      <Cursor target={p >= 1 ? "action" : null} click={p === 2} />
    </>
  );
}

// ---- 3 & 4. Highlight and right-click -------------------------------------------------------------

function HighlightScene({
  paused,
  onDone,
  field,
  before,
}: SceneProps & { field: "name" | "number"; before: Partial<Record<string, string>> }) {
  const p = usePhases([500, 1100, 700, 800, 800, 800, 450, 2000], { paused, onDone });
  const textTarget = field === "name" ? "text-name" : "text-number";
  const itemTarget = field === "name" ? "menu-name" : "menu-whatsapp";
  const key = field === "name" ? "name" : "whatsapp";
  const value = field === "name" ? NAME : NUMBER;
  const saved = p >= 7;
  const cursorTarget = p >= 5 ? itemTarget : p >= 4 ? "menu-root" : p >= 1 ? textTarget : null;
  return (
    <>
      <WhatsAppPage
        toolbar={{
          capturing: true,
          values: saved ? { ...before, [key]: value } : before,
          status: saved ? `${field === "name" ? "Name" : "WhatsApp Number"}: ${value}` : undefined,
          tone: "success",
        }}
        highlight={p >= 2 && !saved ? field : null}
        menu={p >= 3 && p < 7 ? { on: field, hover: p >= 5 ? "item" : p >= 4 ? "root" : null, item: value, itemTarget } : null}
      />
      <Cursor target={cursorTarget} click={p === 3 || p === 6} offset={cursorTarget === textTarget ? [0.85, 0.7] : [0.35, 0.6]} />
    </>
  );
}

const NameScene = (props: SceneProps) => <HighlightScene {...props} field="name" before={{}} />;
const NumberScene = (props: SceneProps) => <HighlightScene {...props} field="number" before={{ name: NAME }} />;

// ---- 5. Pick from lists ---------------------------------------------------------------------------

function PickScene({ paused, onDone }: SceneProps) {
  const p = usePhases([500, 1000, 450, 900, 400, 900, 400, 2000], { paused, onDone });
  const botox = p >= 5;
  const open = p >= 3 && p < 7;
  const cursorTarget = p >= 5 ? "picker-done" : p >= 3 ? "opt-Botox" : p >= 1 ? "chip-treatments" : null;
  return (
    <>
      <WhatsAppPage
        toolbar={{
          capturing: true,
          values: { name: NAME, whatsapp: NUMBER, ...(botox ? { treatments: "Botox" } : {}) },
          pressed: p === 2 ? "chip-treatments" : p === 6 ? "picker-done" : null,
          picker: open
            ? {
                chipKey: "treatments",
                title: "Interested Treatments",
                align: "right",
                options: ["Botox", "Dermal Filler", "Hair Treatment", "Skin Treatment", "Laser"].map((label) => ({ label, checked: label === "Botox" && botox })),
              }
            : null,
        }}
      />
      <Cursor target={cursorTarget} click={p === 2 || p === 4 || p === 6} offset={[0.4, 0.55]} />
    </>
  );
}

// ---- Draw a box (text that can't be highlighted) ------------------------------------------------

/** WhatsApp's Contact info panel, where the name and number can't be selected. */
function ContactInfoPage({ toolbar, box, menu }: { toolbar: Toolbar; box: number; menu: "none" | "open" | "hover" }) {
  return (
    <BrowserFrame url="web.whatsapp.com">
      <MockToolbar
        capturing={toolbar.capturing}
        chips={chips(toolbar.values ?? {})}
        status={toolbar.status}
        tone={toolbar.tone}
        pressed={toolbar.pressed}
      />
      <div className="relative flex h-[440px]">
        <div className="flex-1 bg-[#efeae2] p-6">
          <div className="max-w-[340px] rounded-lg rounded-tl-none bg-white px-3.5 py-2.5 text-[14px] text-[#111b21] shadow-sm">Good morning, is the clinic open today?</div>
        </div>
        <div className="w-[420px] shrink-0 select-none border-l border-black/5 bg-white px-8 pt-8 text-center">
          <p className="text-left text-[13px] text-[#54656f]">Contact info</p>
          <div className="mx-auto mt-4 size-28 rounded-full bg-gradient-to-br from-sky-200 to-indigo-200" />
          <p data-target="ci-name" className="mx-auto mt-4 w-fit text-[20px] font-semibold text-[#111b21]">
            Mohamed Jaffar
          </p>
          <p className="mt-1 text-[14px] text-[#54656f]">+971 56 525 9640</p>
          <p className="mt-1 text-[13px] text-[#667781]">Other Business</p>
        </div>
        {/* Drawing: the page dims and a box grows around the name */}
        <AnimatePresence>
          {box > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/10">
              {box === 1 && (
                <p className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-[12.5px] font-semibold text-white shadow-pop">
                  Drag a box around the name or number. Esc cancels.
                </p>
              )}
              {box >= 2 && (
                <motion.div
                  data-target="draw-box-end"
                  className="absolute rounded-md border-2 border-brand bg-brand/10"
                  style={{ right: 60, top: 184 }}
                  initial={{ width: 8, height: 8 }}
                  animate={{ width: 300, height: 44 }}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                />
              )}
              {menu !== "none" && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-[120px] top-[226px] w-60 rounded-[14px] border border-line bg-white p-1.5 shadow-pop"
                >
                  <p className="mx-1.5 mb-1.5 mt-1 truncate rounded-lg bg-surface-muted px-2.5 py-1.5 text-[12.5px] font-semibold">“Mohamed Jaffar”</p>
                  <p data-target="draw-set-name" className={cn("rounded-lg px-2.5 py-2 text-[13px]", menu === "hover" && "bg-brand-soft text-brand-strong")}>
                    Set as Name
                  </p>
                  <p className="rounded-lg px-2.5 py-2 text-[13px]">Set as WhatsApp Number</p>
                  <p className="rounded-lg px-2.5 py-2 text-[13px]">Set as Instagram</p>
                  <p className="rounded-lg px-2.5 py-2 text-[13px] text-muted">Cancel</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BrowserFrame>
  );
}

function DrawScene({ paused, onDone }: SceneProps) {
  // 0 start · 1 to Draw · 2 click · 3 hint · 4 press at top-right of name · 5 drag · 6 menu · 7 hover Set as Name · 8 click · 9 saved
  const p = usePhases([500, 1000, 400, 900, 700, 1200, 700, 700, 400, 2000], { paused, onDone });
  const saved = p >= 9;
  const cursorTarget = p >= 7 ? "draw-set-name" : p >= 5 ? "draw-box-end" : p >= 4 ? "ci-name" : p >= 1 ? "draw" : null;
  return (
    <>
      <ContactInfoPage
        toolbar={{
          capturing: true,
          values: saved ? { name: "Mohamed Jaffar" } : {},
          status: saved ? "Name: Mohamed Jaffar" : undefined,
          tone: "success",
          pressed: p === 2 ? "draw" : null,
        }}
        box={saved ? 0 : p >= 5 ? 2 : p >= 3 ? 1 : 0}
        menu={saved ? "none" : p >= 7 ? "hover" : p >= 6 ? "open" : "none"}
      />
      <Cursor
        target={cursorTarget}
        click={p === 2 || p === 8}
        offset={cursorTarget === "ci-name" ? [1.12, -0.1] : cursorTarget === "draw-box-end" ? [0, 1] : [0.35, 0.55]}
      />
    </>
  );
}

// ---- 6. Save --------------------------------------------------------------------------------------

function SaveScene({ paused, onDone }: SceneProps) {
  const p = usePhases([600, 1000, 400, 1200, 2800], { paused, onDone });
  const saved = p >= 4;
  return (
    <>
      <WhatsAppPage
        toolbar={{
          capturing: !saved,
          values: { name: NAME, whatsapp: NUMBER, treatments: "Botox" },
          pressed: p === 2 ? "action" : null,
          busy: p === 3,
          status: saved ? `✓ ${NAME} was added.` : p === 3 ? "Saving to GrowDesk…" : undefined,
          tone: saved ? "success" : "pending",
        }}
      >
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.3 }}
              className="absolute bottom-6 right-6 w-80 rounded-2xl border border-line bg-white p-4 shadow-pop"
            >
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                <LogoMark className="size-4" /> In GrowDesk
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-sm font-bold text-white">SF</span>
                <div>
                  <p className="text-sm font-semibold">{NAME}</p>
                  <p className="text-xs text-muted">{NUMBER}</p>
                </div>
                <span className="ml-auto rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong">Interested</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span className="rounded-md bg-surface-muted px-2 py-0.5 font-medium text-foreground/80">Botox</span>
                <span className="flex items-center gap-1">
                  <UserPlus className="size-3.5 text-success" /> New customer
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </WhatsAppPage>
      <Cursor target={p >= 1 && !saved ? "action" : null} click={p === 2} />
    </>
  );
}

// ---- 7. Existing customers and the other buttons ----------------------------------------------

function UpdateScene({ paused, onDone }: SceneProps) {
  const p = usePhases([900, 1500, 1500, 1500, 1600], { paused, onDone });
  const notes = [
    { icon: Search, text: "Found by WhatsApp number or Instagram name, in any format." },
    { icon: UserPlus, text: "Treatments are added and notes appended. Nothing already recorded is cleared." },
    { icon: Check, text: "A booked or seen customer keeps their stage; the toolbar says so." },
  ];
  return (
    <>
      <WhatsAppPage
        toolbar={{
          capturing: false,
          status: `✓ ${NAME} was updated. Stage stays Booked: ${NAME} is further along than Interested.`,
          tone: "warning",
        }}
      >
        <div className="absolute bottom-6 right-6 w-[380px] space-y-2">
          {notes.map((n, i) => (
            <AnimatePresence key={n.text}>
              {p >= i + 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="flex items-start gap-3 rounded-xl border border-line bg-white px-3.5 py-3 text-[13px] shadow-card"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                    <n.icon className="size-4" />
                  </span>
                  {n.text}
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
      </WhatsAppPage>
      <Cursor target={p >= 4 ? "help" : null} click={p === 5} />
    </>
  );
}

export const GUIDE_SCENES: GuideScene[] = [
  {
    title: "Connect this PC",
    text: "Once per PC: your admin creates a connection in GrowDesk. Paste its address, client ID and secret into the GrowDesk Capture settings and press Save & connect.",
    Scene: ConnectScene,
  },
  {
    title: "Press START",
    text: "Open WhatsApp Web or Instagram. The GrowDesk bar sits at the top. Press START when you're talking to a lead.",
    Scene: StartScene,
  },
  {
    title: "Highlight the name",
    text: "Select the name in the chat, right-click, then choose GrowDesk Capture → Set as Name. The Name chip fills in.",
    Scene: NameScene,
  },
  {
    title: "Highlight the number",
    text: "Do the same with the number: Set as WhatsApp Number. Any format works; GrowDesk adds the country code.",
    Scene: NumberScene,
  },
  {
    title: "Can't highlight? Draw a box",
    text: "Some text can't be highlighted, like the name and number in WhatsApp's Contact info. Press Draw on the bar, drag a box around it, then choose Set as Name. Or click a field and choose Draw a box around it.",
    Scene: DrawScene,
  },
  {
    title: "Pick from the lists",
    text: "Treatments, stage and other lists are chosen on the bar. Click the chip, tick what applies, press Done.",
    Scene: PickScene,
  },
  {
    title: "Press STOP to save",
    text: "When every field marked * is filled, press STOP. GrowDesk adds the customer, and the bar confirms it.",
    Scene: SaveScene,
  },
  {
    title: "Existing customers",
    text: "Capturing someone GrowDesk already knows updates them instead. ✕ discards a capture, and ? opens this guide.",
    Scene: UpdateScene,
  },
];
