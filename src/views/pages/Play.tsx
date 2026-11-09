import { useCallback, useRef, useState } from 'react'
import { usePixelScale } from '../../controllers/pixelScale'
import { winLabel as winLabelText } from '../../controllers/reelPresentation'
import { useSoundSettings } from '../../controllers/soundSettings'
import { useMediaQuery } from '../../controllers/useMediaQuery'
import { useSlotMachine } from '../../controllers/useSlotMachine'
import { useSpinHotkey } from '../../controllers/useSpinHotkey'
import { useWinCycle } from '../../controllers/useWinCycle'
import background from '../../assets/bg/background.png'
import backgroundFreeSpins from '../../assets/bg/background_freespins.png'
import SoundDirector from '../audio/SoundDirector'
import BalanceBar from '../game/BalanceBar'
import BetSelector from '../game/BetSelector'
import FreeSpinsBanner from '../game/FreeSpinsBanner'
import GetFreePearlsButton from '../game/GetFreePearlsButton'
import HistoryPanel from '../game/HistoryPanel'
import RulesDialog from '../game/RulesDialog'
import { DESKTOP_SCALE, LAYOUT, SPIN_BUTTON_SCALE } from '../game/layout'
import MuteButton from '../game/MuteButton'
import ReelSet from '../game/ReelSet'
import SpinButton from '../game/SpinButton'
import WinOverlay from '../game/WinOverlay'
import '../game/game.css'

export default function Play() {
  const m = useSlotMachine()
  const sound = useSoundSettings()
  const narrow = useMediaQuery('(max-width: 680px)')
  const stageRef = useRef<HTMLDivElement>(null)
  // Beside the reels on wide screens: the Spin button and the gap before it.
  const spinButtonPx = LAYOUT.spin_button.w * SPIN_BUTTON_SCALE
  const { cssScale: scale } = usePixelScale(stageRef, LAYOUT.reel_frame.w, DESKTOP_SCALE, narrow ? 0 : spinButtonPx + 16)
  const highlights = m.reels.winHighlights
  const step = useWinCycle(m.spinKey, highlights.length, m.timing.winCycleMs)
  const [rulesOpen, setRulesOpen] = useState(false)
  const closeRules = useCallback(() => setRulesOpen(false), [])
  useSpinHotkey(m.pressSpin, !rulesOpen)

  const winLabel = m.showHighlights ? winLabelText(highlights, step, m.spinWinPearls) : ''

  return (
    <main className="play">
      <title>Play — Abyss Pearls</title>
      <SoundDirector subscribe={m.subscribeCues} muted={sound.muted} />
      <div
        ref={stageRef}
        className={`stage${m.featureActive ? ' stage--free' : ''}`}
        data-testid="slot"
        data-phase={m.phase}
        style={{ backgroundImage: `url(${m.featureActive ? backgroundFreeSpins : background})` }}
      >
        <h1 className="stage__title">Abyss Pearls</h1>
        <p className="demo-note">Demo — ✦ Pearls have no monetary value</p>

        {m.feature && m.feature.stage === 'playing' && <FreeSpinsBanner feature={m.feature} onSkip={m.skipFeature} />}

        <div className="machine">
          <div className="machine__reels">
            <ReelSet
              reels={m.reels}
              reelsStopped={m.reelsStopped}
              reelsMoving={m.reelsMoving}
              slammed={m.slammed}
              showHighlights={m.showHighlights}
              highlightStep={step}
              scale={scale}
              reducedMotion={m.reducedMotion}
              anticipating={m.anticipating}
              dimmed={m.bigWin !== null}
            />
            <WinOverlay
              bigWin={m.bigWin}
              feature={m.feature}
              countUpMs={m.timing.countUpMs}
              onSkip={m.skipFeature}
              onContinue={m.continueAfterFeature}
              onSkipBigWin={m.skipBigWin}
              reducedMotion={m.reducedMotion}
            />
          </div>
          <SpinButton mode={m.spinButton} enabled={m.spinEnabled} scale={SPIN_BUTTON_SCALE} onPress={m.pressSpin} />
        </div>

        <p className="win-label" data-testid="win-label">{winLabel}</p>

        <BalanceBar balance={m.balance} bet={m.bet} win={m.win} countUpMs={m.timing.countUpMs} scale={scale} />

        <div className="controls">
          <BetSelector options={m.betOptions} level={m.betLevel} lock={m.betLock} onChange={m.setBetLevel} />
          <div className="controls__row">
            <button type="button" className="chip" data-testid="rules-button" onClick={() => setRulesOpen(true)}>
              Rules &amp; paytable
            </button>
            <MuteButton muted={sound.muted} onToggle={sound.toggleMuted} />
            <GetFreePearlsButton
              enabled={m.canClaimFreePearls}
              grant={m.freePearlsGrant}
              minBet={m.minBet}
              onClaim={m.claimFreePearls}
            />
          </div>
        </div>
        {m.syncedFromOtherTab && (
          <p className="hint" role="status" data-testid="tab-sync-notice">
            Balance updated: Abyss Pearls is open in another tab.
          </p>
        )}
        {m.cannotAffordBet && !m.canClaimFreePearls && (
          <p className="hint" role="status">Not enough Pearls for this bet. Choose a smaller bet.</p>
        )}
        <p className="hint hint--keys">Press Space or Enter to spin. Press again to stop the reels.</p>
      </div>

      <HistoryPanel history={m.history} />

      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="announcer">
        {m.announcement}
      </div>

      <RulesDialog open={rulesOpen} betLevel={m.betLevel} onClose={closeRules} />
    </main>
  )
}
