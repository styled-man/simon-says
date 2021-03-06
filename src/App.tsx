/* eslint-disable react-hooks/exhaustive-deps */
import { FC, useCallback, useEffect, useRef } from "react";
import { AiFillHeart } from "react-icons/ai";
import { ImInfinite } from "react-icons/im";
import useState from "react-usestateref";

import Square from "./components/Square";
import Button from "./components/Button";
import Text from "./components/Text";
import SettingsMenu from "./layouts/SettingsMenu";

import Settings from "./data/Settings";
import Timer from "./data/timer";

import "./app.scss";
import "./styles/styles.global.scss";
import Alert from "./components/Alert";
import { SoundPlayer, audio } from "./data/SoundPlayer";

interface app {
    settings: Settings;
}

const App: FC<app> = ({ settings }) => {
    // When ever I need react to rerender call forceupdate
    const [, updateState] = useState<null | {}>();
    const ForceUpdate = useCallback(() => updateState({}), []);

    /**
     * * Functions for the backend
     */

    const [, setCurrentRound, currentRoundRef] = useState(0);
    const [, setHeartsLeft, heartsLeftRef] = useState(settings.getValueOf("hearts"));
    const settingsRef = useRef(null);
    const [settingsIsOpen, setSettingsIsOpen] = useState(false); // whether or not the settings menu is currently in view

    const alertRef = useRef(null);
    const alertPlayer = (message: string): void => {
        alertRef.current.textContent = message;
    };

    /**
     * Shows or hide the settings menu depending on if it is open already.
     *
     * Also stops the game
     */
    const showSettings = (): void => {
        if (isPlayingRef.current) {
            alertPlayer("Stop the game to modify the settings");
            return;
        }

        if (settingsRef.current.classList.contains("hide")) {
            settingsRef.current.classList.remove("hide");
            setSettingsIsOpen(true);
        } else {
            settingsRef.current.classList.add("hide");
            setSettingsIsOpen(false);
        }
        setIsPlaying(false);
        reset();
    };

    const [timer] = useState(new Timer(settings.getValueOf("time")));
    const [, setShowTimer, showTimerRef] = useState(timer.timeRemaining);
    // contininously update timer
    useEffect(() => {
        setInterval(() => {
            setShowTimer(timer.timeRemaining);
        }, 1000);
    }, []);

    /**
     * * Functions for the frontend
     */

    const [squareColors] = useState(
        Array.from(
            { length: settings.getParams("squares").max },
            () => "#" + Math.floor(Math.random() * 16777215).toString(16)
        )
    );
    const [squareFrequencies] = useState(
        Array.from({ length: settings.getParams("squares").max }, () =>
            parseInt(
                Number.parseFloat((Math.random() * (440 - 261 + 1) + 261).toString()).toFixed(2)
            )
        )
    );
    const squareRef = useRef([]);
    const [animationPattern] = useState([]); // the order the computer highlighted each square
    const addSquare = () => {
        const selectRandomSquare = Math.floor(Math.random() * settings.getValueOf("squares"));
        animationPattern.push(squareRef.current[selectRandomSquare]);
    };

    const [, setInAnimation, inAnimationRef] = useState<number | boolean>(0);
    /**
     * Animates the squares in the order that they were randomly chosen
     */

    const showAnimationPattern = async () => {
        setInAnimation(true);
        const soundPlayer = new SoundPlayer(audio);

        while (inAnimationRef.current) {
            timer.stop();
            setListening(false);
            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
            await delay(1000);

            // highligh each square in order
            for (let square = 0; square < animationPattern.length; square++) {
                animationPattern[square].classList.add("activeSquare");
                soundPlayer
                    .play(
                        animationPattern[square].dataset.frequency,
                        settings.getValueOf("volume") * 0.1,
                        "sine"
                    )
                    .stop(0.75);
                await delay(750);
                animationPattern[square].classList.remove("activeSquare");

                // wait if there is another square to show in the pattern
                void (square !== animationPattern.length - 1 && (await delay(250)));
            }

            timer.start(settings.getValueOf("time"), () => {
                setIsPlaying(-1);
                start();
            });

            setListening(true);
            setInAnimation(false);
        }
    };

    /**
     * * Functions for the player
     */
    const [, setListening, listeningRef] = useState(false); // wheter or not to count when the player click on a square
    const [clickTracker, setClickTracker, clickTrackerRef] = useState(0); // number of times the player click on a square
    /**
     * Check if the user clicked on the correct square.
     * If they did then go to the next round,
     * if they did not the restart this round
     *
     * @param param0 The square the user clicked on
     */
    const handleSquareClicks = ({ target }: { target: any }) => {
        if (listeningRef.current) {
            const correct = target === animationPattern[clickTrackerRef.current];
            if (heartsLeftRef.current && correct) {
                setClickTracker(clickTracker + 1);
                if (clickTrackerRef.current === animationPattern.length) {
                    setCurrentRound(currentRoundRef.current + 1);
                    setClickTracker(0);
                    addSquare();
                    showAnimationPattern();
                }
            } else {
                setClickTracker(0);
                setHeartsLeft(heartsLeftRef.current - 1);
                showAnimationPattern();
            }
        }
    };

    // play the sound when user click and let go of a square
    function* squareClickIter(): Iterator<null> {
        const soundPlayer = new SoundPlayer(audio);

        while (true) {
            if (listeningRef.current && isPlayingRef.current) {
                alertPlayer("Wait your turn!");
            } else {
                const volume = soundPlayer.play(
                    squareClickedRef.current.target.dataset.frequency,
                    settings.getValueOf("volume") * 0.01,
                    "sine"
                );
            }
            yield;

            soundPlayer.stop();
            yield;
        }
    }

    const [, setSquareClicked, squareClickedRef] = useState<any>(null);
    const [squareClick] = useState(squareClickIter());
    const handleSquareEvents = (sqaure: any) => {
        setSquareClicked(sqaure);
        squareClick.next();
    };

    /**
     * * Functions for the game
     */

    const [, setIsPlaying, isPlayingRef] = useState<number | boolean>(0);

    /**
     * When the user clicks the start button
     * make sure the settings menu is hidden,
     * stop or start the game depending on if the game is already running
     */
    const start = () => {
        settingsRef.current.classList.add("hide");

        switch (isPlayingRef.current) {
            // if it is your first time clicking start after the window loaded
            case 0:
                reset();
                addSquare();
                alertPlayer("Game Starting!");
                setIsPlaying(true);
                showAnimationPattern();
                break;
            // game needs to be stop
            case true:
                alertPlayer("GameOver!");
                setIsPlaying(false);
                reset();
                break;
            // game is automatically stop by timer
            case -1:
                setHeartsLeft(heartsLeftRef.current - 1);
                timer.timeRemaining = settings.getValueOf("time");
                if (heartsLeftRef.current > 0) {
                    showAnimationPattern();
                } else {
                    setIsPlaying(false);
                }
                break;
            // game needs to start
            default:
                addSquare();
                alertPlayer("Game Starting!");
                showAnimationPattern();
                setIsPlaying(true);
        }
        setSettingsIsOpen(false);
    };

    /**
     * Change all the settings back to the saved settings
     */
    const reset = () => {
        setListening(false);
        timer.stop();
        timer.timeRemaining = settings.getValueOf("time");
        setClickTracker(0);
        setCurrentRound(0);
        setHeartsLeft(settings.getValueOf("hearts"));
        // make sure none of the squares are highlighted by the computer
        animationPattern.forEach(element => {
            element.classList.remove("activeSquare");
        });
        animationPattern.length = 0;
        setInAnimation(true);
        ForceUpdate();
    };

    // winning and losing
    useEffect(() => {
        if (heartsLeftRef.current <= 0) {
            alert("you lost");
            setIsPlaying(false);
            reset();
        } else if (settings.getValueOf("rounds") === currentRoundRef.current) {
            alert("you won");
            setIsPlaying(false);
            reset();
        }
    }, [currentRoundRef.current, heartsLeftRef.current]);

    return (
        <>
            <div className="background">
                <div className="bg"></div>
                <div className="bg bg2"></div>
                <div className="bg bg3"></div>
            </div>
            <Alert innerRef={alertRef}></Alert>

            <div className="app">
                <nav className="nav">
                    <Text className="title">Memory Game!</Text>
                    <div className="button__container">
                        <Button onClick={showSettings} className="settings__button">
                            {settingsIsOpen ? "Cancel" : "Settings"}
                        </Button>
                    </div>
                    <SettingsMenu
                        className="hide settings"
                        innerRef={settingsRef}
                        settings={settings}
                        closeSettings={showSettings}
                        alertUser={alertPlayer}
                    />
                </nav>
                <main className="main">
                    <Text>Welcome to the game! Repeat the pattern shown on screen!</Text>

                    <div className="info">
                        <Button
                            onClick={start}
                            negative={isPlayingRef.current}
                            positive={!isPlayingRef.current}
                        >
                            {isPlayingRef.current ? "Stop" : "Start"}
                        </Button>
                        <div className="hearts__container">
                            {settings.getValueOf("hearts") === Infinity ? (
                                <div className="healthy__hearts__container">
                                    <Text>
                                        <AiFillHeart className="sick_heart" />
                                        <ImInfinite className="infinity" />
                                        <AiFillHeart className="sick_heart" />
                                    </Text>
                                </div>
                            ) : (
                                <>
                                    <div className="sick__hearts__container">
                                        {[...Array(settings.getValueOf("hearts"))].map(
                                            (e, index) => (
                                                <Text key={index}>
                                                    <AiFillHeart className="sick_heart" />
                                                </Text>
                                            )
                                        )}
                                    </div>
                                    <div className="healthy__hearts__container">
                                        {[...Array(heartsLeftRef.current)].map((e, index) => (
                                            <Text key={index}>
                                                <AiFillHeart className="healthy_heart" />
                                            </Text>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <Text className="time">
                            Time:{" "}
                            {settings.getValueOf("time") === Infinity ? (
                                <ImInfinite className="infinity" />
                            ) : (
                                showTimerRef.current + "s"
                            )}
                        </Text>
                        <Text className="rounds">
                            Round: {currentRoundRef.current}
                            {settings.getValueOf("rounds") === Infinity
                                ? ""
                                : " / " + settings.getValueOf("rounds")}
                        </Text>
                    </div>

                    <div className="squares">
                        {[...Array(settings.getValueOf("squares"))].map((item, index) => (
                            <Square
                                key={index}
                                innerRef={(e: any) => squareRef.current.push(e)}
                                onClick={handleSquareClicks}
                                onMouseDown={handleSquareEvents}
                                onMouseUp={handleSquareEvents}
                                frequency={squareFrequencies[index]}
                                color={squareColors[index]}
                            />
                        ))}
                    </div>
                </main>
            </div>
        </>
    );
};

export default App;
