"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isUsernameUnique, updateUsername as updateUsernameInDb } from "@/lib/user";
import { useAuth } from "@/context/AuthContext";

export function UsernamePopup() {
  const { user, updateUsername } = useAuth();
  const [username, setUsernameState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const handleSubmit = async () => {
    if (!user) return;

    if (username.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    const isUnique = await isUsernameUnique(username);
    if (!isUnique) {
      setError("This username is already taken.");
      return;
    }

    try {
      await updateUsernameInDb(user.uid, username);
      updateUsername(username);
      setIsOpen(false);
    } catch {
      setError("Failed to update username. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent onInteractOutside={(event: { preventDefault: () => any; }) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set your username</DialogTitle>
          <DialogDescription>
            Choose a unique username.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="username"
            className="text-black"
            value={username}
            onChange={(e) => setUsernameState(e.target.value)}
            placeholder="Username"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Set Username</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}