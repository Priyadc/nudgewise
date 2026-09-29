'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Accessibility, Lock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/Controls';
import { Modal } from '@/components/ui/Modal';
import PinPad from '@/components/ui/PinPad';
import { getA11y, setA11y } from '@/lib/client/a11y';
import { checkPin, hasLock, removeLock, setPin } from '@/lib/client/lock';
import { api } from '@/lib/client/api';
import { useApp } from '@/components/layout/AppContext';

function Card({ icon: Icon, title, text, children, delay = 0 }) {
  return (
    <motion.section className="card card-pad" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="row" style={{ marginBottom: 14 }}>
        <span className="stat-icon">
          <Icon />
        </span>
        <div>
          <h3 style={{ fontSize: 16 }}>{title}</h3>
          {text && <p className="small muted">{text}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function Row({ title, text, children }) {
  return (
    <div className="setting-row">
      <div>
        <div className="bold small">{title}</div>
        {text && <div className="tiny muted">{text}</div>}
      </div>
      {children}
    </div>
  );
}

/** Settings → Display & accessibility (saved on this device) */
export function DisplaySettings() {
  const { setUser } = useApp();
  const [a, setA] = useState({ large: false, contrast: false, calm: false });
  useEffect(() => setA(getA11y()), []);
  const toggle = (k, v) => setA(setA11y({ [k]: v }));

  async function replayTour() {
    try {
      const d = await api('/api/user', { method: 'PATCH', body: { settings: { onboarded: false } } });
      setUser(d.user);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Card icon={Accessibility} title="Display & accessibility" text="Make Pockeazy easier to read and use. Saved on this device." delay={0.19}>
      <Row title="Larger text" text="Makes everything about 12% bigger.">
        <Switch checked={a.large} onChange={(v) => toggle('large', v)} label="Larger text" />
      </Row>
      <Row title="High contrast" text="Darker text and clearer borders.">
        <Switch checked={a.contrast} onChange={(v) => toggle('contrast', v)} label="High contrast" />
      </Row>
      <Row title="Calm mode" text="Turns off animations and motion.">
        <Switch checked={a.calm} onChange={(v) => toggle('calm', v)} label="Calm mode" />
      </Row>
      <div className="setting-row" style={{ borderBottom: 0 }}>
        <div>
          <div className="bold small">Welcome tour</div>
          <div className="tiny muted">See the quick introduction again.</div>
        </div>
        <button className="btn btn-soft btn-sm" onClick={replayTour}>
          <RotateCcw /> Replay
        </button>
      </div>
    </Card>
  );
}

/** Settings → Money lock (4-digit PIN on this device) */
export function MoneyLockSettings() {
  const [locked, setLocked] = useState(false);
  const [step, setStep] = useState(null); // 'new' | 'confirm' | 'remove'
  const [first, setFirst] = useState('');
  useEffect(() => setLocked(hasLock()), []);

  const close = () => {
    setStep(null);
    setFirst('');
  };

  return (
    <Card icon={Lock} title="Money lock" text="Ask for a 4-digit PIN before showing the Money page on this device." delay={0.2}>
      <div className="setting-row" style={{ borderBottom: 0 }}>
        <div>
          <div className="bold small">{locked ? 'PIN lock is on' : 'PIN lock is off'}</div>
          <div className="tiny muted">{locked ? 'You’ll enter the PIN once each time you open the app.' : 'Handy if others use your phone or laptop.'}</div>
        </div>
        {locked ? (
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-soft btn-sm" onClick={() => setStep('new')}>
              Change PIN
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('remove')}>
              Turn off
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => setStep('new')}>
            <Lock /> Set a PIN
          </button>
        )}
      </div>

      <Modal open={Boolean(step)} onClose={close} title={step === 'remove' ? 'Turn off the lock' : step === 'confirm' ? 'Confirm your PIN' : 'Choose a 4-digit PIN'}>
        {step === 'new' && (
          <PinPad
            key="new"
            label="Choose a PIN you'll remember"
            onDone={(pin) => {
              setFirst(pin);
              setStep('confirm');
              return true;
            }}
          />
        )}
        {step === 'confirm' && (
          <PinPad
            key="confirm"
            label="Enter it once more"
            onDone={async (pin) => {
              if (pin !== first) {
                toast.error("PINs didn't match — try again");
                setStep('new');
                setFirst('');
                return false;
              }
              await setPin(pin);
              setLocked(true);
              toast.success('Money is now locked with your PIN 🔒');
              close();
              return true;
            }}
          />
        )}
        {step === 'remove' && (
          <PinPad
            key="remove"
            label="Enter your current PIN"
            onDone={async (pin) => {
              if (!(await checkPin(pin))) {
                toast.error('Wrong PIN');
                return false;
              }
              removeLock();
              setLocked(false);
              toast.success('Money lock turned off');
              close();
              return true;
            }}
          />
        )}
      </Modal>
    </Card>
  );
}
