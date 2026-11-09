import { useCallback, useState } from 'react'
import { useMediaQuery } from '../../controllers/useMediaQuery'
import { useSlotMachine } from '../../controllers/useSlotMachine'
import { useSpinHotkey } from '../../controllers/useSpinHotkey'
import { useWinCycle } from '../../controllers/useWinCycle'
import background from '../../assets/bg/background.png'
import backgroundFreeSpins from '../../assets/bg/background_freespins.png'
import BalanceBar from '../game/BalanceBar'
import BetSelector from '../game/BetSelector'
import FreeSpinsBanner from '../game/FreeSpinsBanner'
import GetFreePearlsButton from '../game/GetFreePearlsButton'
import HistoryPanel from '../game/HistoryPanel'
import RulesDialog from '../game/RulesDialog'
import { DESKTOP_SCALE, NARROW_SCALE } from '../game/layout'
import ReelSet from '../game/ReelSet'
import SpinButton from '../game/SpinButton'
import WinOverlay from '../game/WinOverlay'
import '../game/game.css'

export default function Play() {
  const m = useSlotMachine()
  const narrow = useMediaQuery('(max-width: 680px)')
  const scale = narrow ? NARROW_SCALE : DESKTOP_SCALE
  const highlights = m.reels.winHighlights
  const step = useWinCycle(m.spinKey, highlights.length, m.timing.winCycleMs)
  const [rulesOpen, setRulesOpen] = useState(false)
  const closeRules = useCallback(() => setRulesOpen(false), [])
  useSpinHotkey(m.pressSpin, !rulesOpen)

  const winLabel =
    m.showHighlights && highlights.length > 0
      ? step === 'all'
        ? highlights.length === 1
          ? highlights[0].label
          : `${highlights.length} wins`
        : highlights[step].label
      : ''

  return (
    <main className="play">
      <title>Play — Abyss Pearls</title>
      <div
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
            />
            <WinOverlay
              bigWin={m.bigWin}
              feature={m.feature}
              countUpMs={m.timing.countUpMs}
              onSkip={m.skipFeature}
              onContinue={m.continueAfterFeature}
            />
          </div>
          <SpinButton mode={m.spinButton} enabled={m.spinEnabled} scale={scale} onPress={m.pressSpin} />
        </div>

        <p className="win-label" data-testid="win-label">{winLabel}</p>

        <BalanceBar balance={m.balance} bet={m.bet} win={m.win} countUpMs={m.timing.countUpMs} scale={scale} />

        <div className="controls">
          <BetSelector options={m.betOptions} level={m.betLevel} disabled={!m.canChangeBet} onChange={m.setBetLevel} />
          <button type="button" className="chip" data-testid="rules-button" onClick={() => setRulesOpen(true)}>
            Rules &amp; paytable
          </button>
          <GetFreePearlsButton
            enabled={m.canClaimFreePearls}
            grant={m.freePearlsGrant}
            minBet={m.minBet}
            onClaim={m.claimFreePearls}
          />
        </div>
        {m.cannotAffordBet && !m.canClaimFreePearls && (
          <p className="hint" role="status">Not enough Pearls for this bet. Choose a smaller bet.</p>
        )}
        <p className="hint">Press Space or Enter to spin. Press again to stop the reels.</p>
      </div>

      <HistoryPanel history={m.history} />

      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="announcer">
        {m.announcement}
      </div>

      <RulesDialog open={rulesOpen} betLevel={m.betLevel} onClose={closeRules} />
    </main>
  )
}
