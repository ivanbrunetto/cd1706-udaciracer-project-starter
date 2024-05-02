// The store will hold all information needed globally
let store = {
	track_id: undefined,
	track_name: undefined,
	track_size: undefined, 
	track_size_by_segment: undefined,
	player_id: undefined,
	player_name: undefined,
	race_id: undefined,
}

// We need our javascript to wait until the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
	onPageLoad();
	setupClickHandlers();
})

async function onPageLoad() {
	try {
		getTracks()
			.then(tracks => {
				const html = renderTrackCards(tracks)
				renderAt('#tracks', html);
			})

		getRacers()
			.then((racers) => {
				const html = renderRacerCars(racers)
				renderAt('#racers', html);
			})
	} catch(error) {
		console.error('Problem getting tracks and racers ::', error);
	}
}

function setupClickHandlers() {
	document.addEventListener('click', function(event) {
		const { target } = event;

		// Race track form field
		if (target.matches('.card.track')) {
			handleSelectTrack(target);
			store.track_id = target.id;
			store.track_name = target.innerHTML;
		}

		// Racer form field
		if (target.matches('.card.racer')) {
			handleSelectRacer(target);
			store.player_id = target.id;
			store.player_name = target.innerHTML;
		}

		// Submit create race form
		if (target.matches('#submit-create-race')) {
			event.preventDefault();
	
			// start race
			handleCreateRace();
		}

		// Handle acceleration click
		if (target.matches('#gas-peddle')) {
			handleAccelerate();
		}

		console.log('Store updated :: ', store);
	}, false);
}

async function delay(ms) {
	try {
		return await new Promise(resolve => setTimeout(resolve, ms));
	} catch(error) {
		console.error('Delay error ::', error);
	}
}

// This async function controls the flow of the race, 
// add the logic and error handling
async function handleCreateRace() {
	// render starting UI
	renderAt('#race', renderRaceStartView(store.track_name));

	const player_id = store.player_id;
	const track_id = store.track_id;
	const race = await createRace(player_id, track_id);
	
	console.log('RACE created :: ', race);
	store.race_id = race.ID;
	calculateTrackSize(race.Track);
	
	// The race has been created, now start the countdown
	await runCountdown();

	await startRace(race.ID);
	await runRace(race.ID);
}

function runRace(raceID) {
	try {
		return new Promise(resolve => {
			const raceInterval = setInterval(async () => {
				const race = await getRace(raceID);
				if (race.status === 'in-progress') {
					renderAt('#leaderBoard', raceProgress(race.positions));
				} else if (race.status === 'finished') {
					// stop the interval from repeating
					clearInterval(raceInterval);
					// to render the results view
					renderAt('#race', resultsView(race.positions));
					// resolve the promise
					resolve(race);		
				} else {
					clearInterval(raceInterval);
					throw new Error('race status is invalid:', race.status);
				}
			}, 500);
		})
	} catch (error) {
		console.error('Problem running the race ::', error);
		clearInterval(raceInterval);
	}
	
}

async function runCountdown() {
	try {
		// wait for the DOM to load
		await delay(1000);
		let timer = 3;
		document.getElementById('big-numbers').innerHTML = --timer;

		return new Promise(resolve => {
			// use Javascript's built in setInterval method 
			// to count down once per second
			const timerId = setInterval(() => {
				if (!timer) {
					// when the setInterval timer hits 0, 
					// clear the interval, resolve the promise, and return
					clearInterval(timerId);
					resolve();
				} else {
					// run this DOM manipulation inside the set interval 
					// to decrement the countdown for the user
					document.getElementById('big-numbers').innerHTML = --timer;
				}
			}, 1000);
		})
	} catch(error) {
		console.error('Problem with the count down ::', error);
		console.error(error);
	}
}

function handleSelectRacer(target) {
	// remove class selected from all racer options
	const selected = document.querySelector('#racers .selected');
	if(selected) {
		selected.classList.remove('selected');
	}

	// add class selected to current target
	target.classList.add('selected');
}

function handleSelectTrack(target) {
	// remove class selected from all track options
	const selected = document.querySelector('#tracks .selected');
	if (selected) {
		selected.classList.remove('selected');
	}

	// add class selected to current target
	target.classList.add('selected');
}

function handleAccelerate() {
	accelerate(store.race_id);
}

function calculateTrackSize(track) {
	// initialize
	store.track_size = 0;
	store.track_size_by_segment = [];
	
	// calculate total size
	track.segments.map(segment => store.track_size += segment);
	
	// calculate accumulated size for each segment
	let count = 0;
	track.segments.reduce((accumulatedSize, currentSize) => {
		store.track_size_by_segment[count++] = accumulatedSize + currentSize;
		return accumulatedSize + currentSize;
	}, 0);
}

// HTML VIEWS ------------------------------------------------

function renderRacerCars(racers) {
	if (!racers.length) {
		return `
			<h4>Loading Racers...</4>
		`;
	}

	const results = racers.map(renderRacerCard).join('')

	return `
		<ul id="racers">
			${results}
		</ul>
	`;
}

// Callback function to render each racer from the racers list
function renderRacerCard(racer) {
	const { id, driver_name, top_speed, acceleration, handling } = racer;
	
	return `
		<h4 
		class="card racer" 
		id="${id}"
		title="Top Speed: ${top_speed} 
			/ Acceleration: ${acceleration} 
			/ Handling: ${handling}"
		>
			${driver_name}
		</h4>
	`;
}

function renderTrackCards(tracks) {
	if (!tracks.length) {
		return `
			<h4>Loading Tracks...</4>
		`;
	}

	const results = tracks.map(renderTrackCard).join('');

	return `
		<ul id="tracks">
			${results}
		</ul>
	`;
}

// Callback function to render eack track from the tracks list
function renderTrackCard(track) {
	const { id, name } = track;

	return `
		<h4 id="${id}" class="card track">${name}</h4>
	`;
}

function renderCountdown(count) {
	return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`;
}

function renderRaceStartView(track) {
	return `
		<header>
			<h1>Race: ${track.name}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`;
}

function resultsView(positions) {
	let userPlayer = positions.find(e => e.id === parseInt(store.player_id));
	userPlayer.driver_name += ' (you)';
	
	positions = positions.sort(
		(a, b) => (a.final_position < b.final_position) ? -1 : 1
	);
	let count = 1;
  
	const results = positions.map(renderPositionCard);

	return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			<h3>Race Results</h3>
			<p>The race is done! Here are the final results:</p>
			${results.join('')}
			<a href="/race">Start a new race</a>
		</main>
	`;
}

// Callback function to render each position 
function renderPositionCard(position, index) {
	return `
		<tr>
			<td>
				<h4 
				class="card racer" 
				id="${index}">${index + 1} - ${position.driver_name}</h4>
			</td>
		</tr>
	`;
}

function raceProgress(positions) {
	let userPlayer = positions.find(e => e.id === parseInt(store.player_id));
	userPlayer.driver_name += " (you)";

	positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1);
	let count = 1;
	const progressCount = Math.round(
		!positions[0].segment ? 0 : 
		(store.track_size_by_segment[positions[0].segment - 1] / 
		store.track_size) 
		* 100);

	const progress = `
		<tr>
			<td>
				<h2>
					<label for="progress">Race progress:</label>
					<progress id="progress" max="100" value="${progressCount}">
					</progress>
				</h2> 
			</td>
		</tr>
	`;
	
	const results = positions.map(renderPositionCard);

	return `
		<table>
			${progress}
			${results.join('')}
		</table>
	`;
}

function renderAt(element, html) {
	const node = document.querySelector(element);
	node.innerHTML = html;
}


// API CALLS ------------------------------------------------

const SERVER = 'http://localhost:3001'

function defaultFetchOpts() {
	return {
		mode: 'cors',
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin' : SERVER,
		},
	};
}

// Make a fetch call (with error handling!) to each of the following API endpoints 

function getTracks() {
	// GET request to `${SERVER}/api/tracks`
	return fetch(`${SERVER}/api/tracks`)
	.then(response => {
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
		return response.json();
	})
	.catch(error => console.error('Could not get tracks ::', error));
}

function getRacers() {
	// GET request to `${SERVER}/api/cars`
	return fetch(`${SERVER}/api/cars`)
	.then(response => {
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
		return response.json();
	})
	.catch(error => console.error('Problem with getRacers :: ', error));
}

function createRace(player_id, track_id) {
	player_id = parseInt(player_id);
	track_id = parseInt(track_id);
	const body = { player_id, track_id };
	
	return fetch(`${SERVER}/api/races`, {
		method: 'POST',
		...defaultFetchOpts(),
		body: JSON.stringify(body)
	})
	.then(response => {
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
		return response.json();
	})	
	.catch(error => console.error('Problem with createRace request::', error));
}

function getRace(id) {
	// GET request to `${SERVER}/api/races/${id}`
	return fetch(`${SERVER}/api/races/${id}`)
	.then(response => {
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
		return response.json();
	})
	.catch(error => console.error('Problem with getRace:: ', error));
}

function startRace(id) {
	console.log('START RACE ::', id);
	return fetch(`${SERVER}/api/races/${id}/start`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.then(response => {
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
	})
	.catch(error => console.error('Problem with startRace request ::', error));
}

function accelerate(id) {
	// POST request to `${SERVER}/api/races/${id}/accelerate`
	// options parameter provided as defaultFetchOpts
	// no body or datatype needed for this request
	return fetch(`${SERVER}/api/races/${id}/accelerate`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.then(response => {
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
	})
	.catch(error => console.error('Problem with accelerate request ::', error));
}
