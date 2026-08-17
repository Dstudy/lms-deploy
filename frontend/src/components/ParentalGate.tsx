
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ParentalGate({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void 
}) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNum1(Math.floor(Math.random() * 10) + 5);
      setNum2(Math.floor(Math.random() * 10) + 5);
      setAnswer("");
      setError(false);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (parseInt(answer) === num1 + num2) {
      onSuccess();
      onClose();
    } else {
      setError(true);
      setAnswer("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-3xl p-8 bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center text-primary-foreground">Parents Only</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4 text-center">
          <p className="text-muted-foreground text-lg">Please solve this puzzle to continue:</p>
          <div className="text-4xl font-bold text-primary-foreground tracking-widest">
            {num1} + {num2} = ?
          </div>
          <Input 
            type="number" 
            value={answer} 
            onChange={(e) => setAnswer(e.target.value)}
            className="text-center text-2xl h-14 border-2 border-primary focus-visible:ring-primary rounded-2xl"
            placeholder="Type your answer"
            autoFocus
          />
          {error && <p className="text-destructive font-medium">Oops! Try again.</p>}
          <Button 
            onClick={handleSubmit} 
            className="w-full h-14 text-xl rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg"
          >
            Go to Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
