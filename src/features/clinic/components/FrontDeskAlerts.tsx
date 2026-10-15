"use client";
// Front-desk alerts on the Clinic page: when any doctor calls a token (Call next, Recall, Complete & call next),
// people who run reception (clinic.appointments.manage) get a toast and, once they turn it on, a chime. The same call
// also lands in their notifications (server side). Renders the chime toggle.
import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/Toaster";
import { useRealtimeEvent } from "@/realtime";
import { useClinicAccess } from "../hooks/useClinic";
import type { TokenCalledEvent } from "../services/clinicService";
import { chime, createAudio } from "../utils/chime";

export function FrontDeskAlerts() {
  const access = useClinicAccess();
  const toast = useToast();
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);

  useRealtimeEvent<TokenCalledEvent>("clinic.token.called", ({ data }) => {
    if (!access.manageAppointments) return;
    toast.info(`Token ${data.token} called`, `${data.providerName}${data.room ? ` · ${data.room}` : ""}`);
    if (sound && audio.current) chime(audio.current);
  });

  if (!access.manageAppointments) return null;

  function toggle() {
    if (!sound) {
      // Created on a click, so the browser lets it play.
      audio.current ??= createAudio();
      if (audio.current) chime(audio.current);
    }
    setSound(!sound);
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-pressed={sound} title={sound ? "A chime plays when a token is called" : "Play a chime when a token is called"}>
      {sound ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
      {sound ? "Chime on" : "Chime off"}
    </Button>
  );
}
