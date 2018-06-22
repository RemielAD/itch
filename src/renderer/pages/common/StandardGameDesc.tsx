import React from "react";
import { urlForGame } from "common/util/navigation";
import { Game, GameClassification } from "common/butlerd/messages";
import { TitleBox, Title } from "renderer/pages/PageStyles/games";
import { T } from "renderer/t";
import Filler from "renderer/basics/Filler";
import PlatformIcons from "renderer/basics/PlatformIcons";
import butlerCaller from "renderer/hocs/butlerCaller";
import { messages } from "common/butlerd";
import { withProfileId } from "renderer/hocs/withProfileId";

const FetchUser = butlerCaller(messages.FetchUser);

const StandardGameDesc = ({
  game,
  children,
  profileId,
}: {
  game: Game;
  children?: any;
  profileId: number;
}) => (
  <TitleBox>
    <a href={urlForGame(game.id)}>
      <Title>
        {game.title}
        {children}
      </Title>
    </a>
    <p>{game.shortText}</p>
    <Filler />
    <p>
      {renderClassification(game.classification)}
      <PlatformIcons target={game} before={() => <>&nbsp;&nbsp;</>} />
      {!game.userId ? null : (
        <FetchUser
          params={{ profileId, userId: game.userId }}
          render={({ result }) => {
            if (!result || !result.user) {
              return null;
            }
            const { user } = result;

            return (
              <>
                &nbsp;&nbsp;by&nbsp;&nbsp;
                <a href={user.url}>
                  <img
                    src={user.stillCoverUrl || user.coverUrl}
                    style={{
                      width: "1em",
                      height: "1em",
                      borderRadius: "4px",
                      marginRight: ".5em",
                    }}
                  />
                  {result.user.username}
                </a>
              </>
            );
          }}
        />
      )}
    </p>
  </TitleBox>
);

export default withProfileId(StandardGameDesc);

function renderClassification(classification: GameClassification) {
  let label = [`usage_stats.description.${classification}`];

  return <>{T(label)}</>;
}
