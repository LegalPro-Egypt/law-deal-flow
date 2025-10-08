import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, X, Video } from 'lucide-react';
import { motion } from 'framer-motion';

interface IncomingCallModalProps {
  callerName: string;
  caseTitle: string;
  callType: 'video' | 'voice';
  onAnswer: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  callerName,
  caseTitle,
  callType,
  onAnswer,
  onDecline,
}) => {
  const initials = callerName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-8 max-w-sm w-full border border-gray-200 shadow-2xl"
      >
        {/* Avatar with pulse animation */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <Avatar className="w-24 h-24">
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full bg-primary/30"
          />
        </div>

        {/* Caller info */}
        <h2 className="text-gray-800 text-2xl font-semibold text-center mb-2">
          {callerName}
        </h2>
        
        <p className="text-gray-600 text-center mb-2">
          {caseTitle}
        </p>

        <div className="flex items-center justify-center gap-2 text-primary mb-8">
          {callType === 'video' ? (
            <Video className="w-5 h-5" />
          ) : (
            <Phone className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">
            Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <Button
            onClick={onDecline}
            size="lg"
            variant="destructive"
            className="flex-1 rounded-full bg-red-600 hover:bg-red-700"
          >
            <X className="w-5 h-5 mr-2" />
            Decline
          </Button>

          <Button
            onClick={onAnswer}
            size="lg"
            className="flex-1 rounded-full bg-green-600 hover:bg-green-700 text-white"
          >
            <Phone className="w-5 h-5 mr-2" />
            Answer
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};