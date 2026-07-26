interface PlayerEditFormProps {
  playerId: string | undefined
}

export function PlayerEditForm({ playerId }: PlayerEditFormProps) {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">
          {playerId ? `Player ${playerId}` : 'New Player'}
        </h2>
        <p className="opacity-70">Player edit form placeholder</p>
      </div>
    </div>
  )
}