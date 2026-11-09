interface GetFreePearlsButtonProps {
  readonly enabled: boolean
  readonly grant: number
  readonly minBet: number
  readonly onClaim: () => void
}

/** The only way to top up: free virtual Pearls when the balance is below the smallest bet. */
export default function GetFreePearlsButton({ enabled, grant, minBet, onClaim }: GetFreePearlsButtonProps) {
  return (
    <button
      type="button"
      className="chip chip--free"
      disabled={!enabled}
      onClick={onClaim}
      title={enabled ? undefined : `Available when your balance is below ✦ ${minBet}`}
    >
      Get Free Pearls (+{grant.toLocaleString('en-US')} ✦)
    </button>
  )
}
