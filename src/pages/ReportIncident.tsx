import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, ArrowRight, Check, FileCode2, Sparkles, Trash2 } from "lucide-react";
import { useApp } from "../app/state";
import type { Severity } from "../data/demo";
import { PageHeader } from "../components/ui";

type Form = {
  title: string;
  description: string;
  service: string;
  severity: Severity;
  logs: string;
  environment: string;
};
const initial: Form = {
  title: "",
  description: "",
  service: "",
  severity: "High",
  logs: "",
  environment: "Production",
};

export function ReportIncident() {
  const [form, setForm] = useState<Form>(initial);
  const [customService, setCustomService] = useState("");
  const [customEnvironment, setCustomEnvironment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<string | null>(null);
  const { addIncident, toast } = useApp();
  const navigate = useNavigate();
  const update = (field: keyof Form, value: string) =>
    setForm((old) => ({ ...old, [field]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.title.trim().length < 5) next.title = "Use at least 5 characters.";
    if (form.description.trim().length < 20)
      next.description = "Add at least 20 characters so responders have context.";

    const finalService = form.service === "Other" ? customService.trim() : form.service;
    const finalEnvironment = form.environment === "Other" ? customEnvironment.trim() : form.environment;

    if (!form.service) {
      next.service = "Choose an affected service or select 'Other'.";
    } else if (form.service === "Other" && customService.trim().length < 2) {
      next.customService = "Specify the custom service name (at least 2 characters).";
    }

    if (form.environment === "Other" && customEnvironment.trim().length < 2) {
      next.customEnvironment = "Specify the custom environment name.";
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    const id = await addIncident({
      ...form,
      service: finalService,
      environment: finalEnvironment,
    });
    setSubmitted(id);
    toast(`${id} created successfully`);
  };
  if (submitted)
    return (
      <div className="mx-auto max-w-3xl pt-10">
        <div className="panel relative overflow-hidden bg-[#D6FF45] p-8 text-black sm:p-12">
          <div className="absolute -right-12 -top-12 size-48 rotate-12 rounded-[40px] border-[18px] border-black/10" />
          <span className="grid size-16 place-items-center rounded-full bg-black text-[#D6FF45]">
            <Check size={32} />
          </span>
          <p className="eyebrow mt-8">Report received</p>
          <h1 className="mt-2 font-display text-5xl font-black tracking-[-.06em] sm:text-7xl">
            {submitted} is live.
          </h1>
          <p className="mt-5 max-w-xl font-medium">
            The incident has been persisted in the workspace database. Start an AI investigation
            or return to the command center.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="btn-dark"
              onClick={() => navigate("/investigation", { state: { incidentId: submitted } })}
            >
              Start investigation <ArrowRight size={17} />
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setSubmitted(null);
                setForm(initial);
              }}
            >
              Report another
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div>
      <PageHeader
        eyebrow="Intake / New signal"
        title="Report the unexpected."
        description="Capture the first clear snapshot. IncidentMind will structure this context for responders and future simulated investigation."
      />
      <form onSubmit={submit} noValidate className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="panel space-y-6">
          <div>
            <label className="label" htmlFor="title">
              Incident title *
            </label>
            <input
              id="title"
              className={`field ${errors.title ? "field-error" : ""}`}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Checkout API latency above 4 seconds"
            />
            {errors.title && <p className="error">{errors.title}</p>}
          </div>
          <div>
            <label className="label" htmlFor="description">
              What is happening? *
            </label>
            <textarea
              id="description"
              rows={5}
              className={`field resize-y ${errors.description ? "field-error" : ""}`}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe the symptoms, when they started, and observed user impact..."
            />
            {errors.description && <p className="error">{errors.description}</p>}
            <p className="mt-1 text-right text-[11px] font-bold opacity-35">
              {form.description.length} characters
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="service">
                Affected service *
              </label>
              <select
                id="service"
                className={`field ${errors.service ? "field-error" : ""}`}
                value={form.service}
                onChange={(e) => update("service", e.target.value)}
              >
                <option value="">Select a service</option>
                <option value="Edge Gateway / MQTT">Edge Gateway / MQTT Broker</option>
                <option value="Firmware OTA Service">Firmware OTA Service</option>
                <option value="Telemetry Pipeline">Telemetry Pipeline / Sensor Stream</option>
                <option value="Modbus / RS-485 Serial">Modbus / RS-485 Serial Bus</option>
                <option value="Solar Inverter Array">Solar Inverter Array / Power Node</option>
                <option value="Battery Management (BMS)">Battery Management System (BMS)</option>
                <option value="Sensor Ingestion Node">Sensor Ingestion / Actuator Node</option>
                <option value="Identity & Auth">Identity & Edge Auth</option>
                <option value="Database / Storage">Database / Time-Series Storage</option>
                <option value="Checkout API">Checkout API</option>
                <option value="Other">Other (Custom Service)...</option>
              </select>
              {errors.service && <p className="error">{errors.service}</p>}

              {/* Custom Service Input when "Other" is chosen */}
              {form.service === "Other" && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    className={`field ${errors.customService ? "field-error" : ""}`}
                    value={customService}
                    onChange={(e) => {
                      setCustomService(e.target.value);
                      if (errors.customService) setErrors((prev) => ({ ...prev, customService: "" }));
                    }}
                    placeholder="Enter custom service (e.g. Robot Arm Controller)"
                    autoFocus
                  />
                  {errors.customService && <p className="error">{errors.customService}</p>}
                </div>
              )}
            </div>

            <div>
              <label className="label" htmlFor="environment">
                Environment
              </label>
              <select
                id="environment"
                className="field"
                value={form.environment}
                onChange={(e) => update("environment", e.target.value)}
              >
                <option value="Production">Production (Live Fleet)</option>
                <option value="Staging">Staging / Pre-deployment</option>
                <option value="Development">Development / Hardware Lab</option>
                <option value="Industrial Floor">Industrial Factory Floor</option>
                <option value="Field Deployment">Field Deployment (Remote Site)</option>
                <option value="Other">Other (Custom Environment)...</option>
              </select>

              {/* Custom Environment Input when "Other" is chosen */}
              {form.environment === "Other" && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    className={`field ${errors.customEnvironment ? "field-error" : ""}`}
                    value={customEnvironment}
                    onChange={(e) => {
                      setCustomEnvironment(e.target.value);
                      if (errors.customEnvironment) setErrors((prev) => ({ ...prev, customEnvironment: "" }));
                    }}
                    placeholder="Enter custom environment (e.g. Cold Storage Bay 4)"
                    autoFocus
                  />
                  {errors.customEnvironment && <p className="error">{errors.customEnvironment}</p>}
                </div>
              )}
            </div>
          </div>
          <fieldset>
            <legend className="label">Severity</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["Critical", "High", "Medium", "Low"] as Severity[]).map((level) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => update("severity", level)}
                  className={`severity-choice ${form.severity === level ? "selected" : ""}`}
                >
                  <span
                    className={`size-2 rounded-full ${level === "Critical" ? "bg-[#FF5A1F]" : level === "High" ? "bg-[#6428C8]" : level === "Medium" ? "bg-[#3155E7]" : "bg-[#8CA900]"}`}
                  />
                  {level}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
              <label className="label mb-0" htmlFor="logs">
                Error logs / diagnostics
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold opacity-45">Quick 1-click sample:</span>
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      title: "Edge Gateway Buffer Overflow",
                      description: "Factory edge sensor burst caused ring buffer to overflow and drop telemetry packets.",
                      service: "Edge Gateway / MQTT",
                      severity: "High",
                      environment: "Industrial Floor",
                      logs: "ERROR [EdgeGateway-04]: RingBuffer capacity exceeded (max 512KB, arrival 2048KB) - 500 telemetry packets dropped.",
                    });
                    setCustomService("");
                    setCustomEnvironment("");
                    setErrors({});
                    toast("Loaded 1-line Edge Buffer Overflow sample!");
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-[#FF5A1F]/15 text-[#FF5A1F] hover:bg-[#FF5A1F]/25 transition flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  <span>⚡ 1-Line Buffer Overflow</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      title: "Modbus RTU RS485 Clock Skew",
                      description: "Baud rate clock drift caused CRC16 checksum mismatches on edge inverter bus.",
                      service: "Modbus / RS-485 Serial",
                      severity: "Critical",
                      environment: "Industrial Floor",
                      logs: "ERROR [Modbus-RTU]: CRC16 mismatch 0x4A1B != 0x9F3C on slave node #12 (baud 9600, 3 retries failed).",
                    });
                    setCustomService("");
                    setCustomEnvironment("");
                    setErrors({});
                    toast("Loaded 1-line Modbus CRC sample!");
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-[#3155E7]/15 text-[#3155E7] hover:bg-[#3155E7]/25 transition flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  <span>🔄 Modbus CRC</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <FileCode2 className="absolute left-4 top-4 opacity-35" size={18} />
              <textarea
                id="logs"
                rows={6}
                className="field resize-y pl-11 font-mono text-xs"
                value={form.logs}
                onChange={(e) => update("logs", e.target.value)}
                placeholder="Paste sanitized logs, stack traces, or metrics here..."
              />
            </div>
            <p className="mt-2 text-xs opacity-45">
              Avoid secrets, access tokens, and personal data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setForm(initial);
                setErrors({});
                toast("Form draft discarded");
              }}
              className="btn-secondary px-5 py-4 text-xs font-black flex items-center justify-center gap-1.5"
            >
              <Trash2 size={16} /> Discard Draft
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center py-4">
              Submit incident <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <aside className="space-y-5">
          <div className="panel rotate-1 bg-[#3155E7] text-white">
            <Sparkles className="text-[#D6FF45]" />
            <h2 className="mt-5 font-display text-3xl font-black">
              Better context. Faster recovery.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Specific symptoms and timestamps help narrow potential causes and retrieve stronger
              memory matches.
            </p>
          </div>
          <div className="panel">
            <p className="eyebrow">Before submitting</p>
            <ul className="mt-4 space-y-3 text-sm font-semibold">
              {[
                "Confirm customer impact",
                "Include the first observed time",
                "Sanitize diagnostic logs",
                "Select the highest valid severity",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <Check size={17} className="text-[#2A8F72]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-3 rounded-[22px] border-2 border-[#FF5A1F] bg-[#FF5A1F]/10 p-4 text-sm">
            <AlertTriangle className="shrink-0 text-[#FF5A1F]" size={19} />
            <p>
              <b>Critical outage?</b>
              <br />
              <span className="opacity-60">
                Follow your on-call escalation policy alongside this report.
              </span>
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
