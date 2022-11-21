import { async } from '@firebase/util';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, doc, getDocs, getDoc, addDoc, setDoc, orderBy, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, GithubAuthProvider, setPersistence, browserSessionPersistence, signInWithRedirect, getRedirectResult, signInWithCredential } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCtjyPJ7LqQUQZgiy1uxYcTPAj_p6zE4WM",
  authDomain: "fire-giftr-90f99.firebaseapp.com",
  projectId: "fire-giftr-90f99",
  storageBucket: "fire-giftr-90f99.appspot.com",
  messagingSenderId: "467929754522",
  appId: "1:467929754522:web:6b71ed2606f27ef6eb2823",
  measurementId: "G-7M8WRM3NZ2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const people = [];
const ideas = [];
let selectedPersonId = null;
let selectedIdeaId = null;

const auth = getAuth(app);
const user = auth.currentUser;
auth.languageCode = 'en';
const provider = new GithubAuthProvider();
provider.setCustomParameters({
  'allow_signup': 'true',
});

document.addEventListener('DOMContentLoaded', () => {
  //set up the dom events
  document
    .getElementById('btnCancelPerson')
    .addEventListener('click', hideOverlay);
  document
    .getElementById('btnCancelIdea')
    .addEventListener('click', hideOverlay);
  document.querySelector('.overlay').addEventListener('click', hideOverlay);

  document
    .getElementById('btnAddPerson')
    .addEventListener('click', showOverlay);
  document.getElementById('btnAddIdea').addEventListener('click', showOverlay);
  document.getElementById('btnSignIn').addEventListener('click', showOverlay);

  document
    .getElementById('btnSavePerson')
    .addEventListener('click', savePerson);
  document.getElementById('btnSaveIdea').addEventListener('click', saveIdea);

  document.querySelector('.person-list').addEventListener('click', handleSelectPerson);
  document.querySelector('.idea-list').addEventListener('click', handleSelectIdea);
  document.getElementById('btnSignIn').addEventListener('click', handleSignIn);
  // handleSelectIdea();
  loadData();
});

function loadData(){
  getPeople();
}

/* CODE FOR PEOPLE */

async function getPeople(){
  //call this from DOMContentLoaded init function 
  //the db variable is the one created by the getFirestore(app) call.
  const querySnapshot = await getDocs(collection(db, 'people'));
  querySnapshot.forEach((doc) => {
    //every `doc` object has a `id` property that holds the `_id` value from Firestore.
    //every `doc` object has a doc() method that gives you a JS object with all the properties
    const data = doc.data();
    const id = doc.id;
    people.push({id, ...data});
  });
  selectedPersonId = buildPeople(people);

  let li = document.querySelector(`[data-id="${selectedPersonId}"]`);
  li.click();
}

function buildPeople(people){
  //build the HTML
  let ul = document.querySelector('ul.person-list');
  let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August','September', 'October', 'November', 'December'];
  //replace the old ul contents with the new.
  ul.innerHTML = people.map(person=>{
    const dob = `${months[person['birth-month']-1]} ${person['birth-day']}`;
    //Use the number of the birth-month less 1 as the index for the months array
    return `<li data-id="${person.id}" class="person">
            <p class="name">${person.name}</p>
            <p class="dob">${dob}</p>
            <button class="edit"> Edit </button>
            <button class="delete"> Delete </button>
          </li>`;
  }).join('');

  let selected = people[0].id;
  return selected;
}

async function savePerson(ev){
  //function called when user clicks save button from person dialog
  let name = document.getElementById('name').value;
  let month = document.getElementById('month').value;
  let day = document.getElementById('day').value;
  if(!name || !month || !day) return; //form needs more info 
  const person = {
    name,
    'birth-month': month,
    'birth-day': day
  };
  try {
    const docRef = await addDoc(collection(db, 'people'), person );
    console.log('Document written with ID: ', docRef.id);
    //1. clear the form fields 
    document.getElementById('name').value = '';
    document.getElementById('month').value = '';
    document.getElementById('day').value = '';
    //2. hide the dialog and the overlay
    hideOverlay();
    //3. display a message to the user about success 
    tellUser(`Person ${name} added to database`);
    person.id = docRef.id;
    //4. ADD the new HTML to the <ul> using the new object
    showPerson(person);
  } catch (err) {
    console.error('Error adding document: ', err);
    //do you want to stay on the dialog?
    //display a mesage to the user about the problem
  }
}

function showPerson(person){
  //add the newly created person OR update if person exists
  const ul = document.querySelector('ul.person-list');
  const dob = `${months[person['birth-month']-1]} ${person['birth-day']}`;
  ul.innerHTML += `<li data-id="${person.id}" class="person">
    <p class="name">${person.name}</p>
    <p class="dob">${dob}</p>
    <button class="edit"> Edit </button>
    <button class="delete"> Delete </button>
  </li>`;
  //add to people array
  people.push(person);
}

function handleSelectPerson(ev){
  //ev.target; - could be the button OR anything in the ul.
  const li = ev.target.closest('.person'); //see if there is a parent <li class="person">
  // console.log(`${li.getAttribute('data-id')} was clicked`);
  const id = li ? li.getAttribute('data-id') : null; // if li exists then the user clicked inside an <li>
  
  if(id){
    //user clicked inside li
    selectedPersonId = id;
    //did they click the li content OR an edit button OR a delete button?
    if(ev.target.classList.contains('edit')){
      ev.preventDefault();
      document.querySelector('.overlayPpl').classList.add('active');
      document.getElementById('editPerson').classList.add('active');
      
      document.getElementById('btnSave').addEventListener('click', saveIt);
      document.getElementById('btnCancel').addEventListener('click',  function(ev){
        hideOverlayPpl();
      });
    }else if(ev.target.classList.contains('delete')){
      ev.preventDefault();
      document.querySelector('.overlayPpl').classList.add('active');
      document.getElementById('deletePerson').classList.add('active');
      
      document.getElementById('btnDelete').addEventListener('click', deleteIt);
      document.getElementById('btnCancel2').addEventListener('click', function(ev){
        hideOverlayPpl();
      });
    }else{
      //content inside the <li> but NOT a <button> was clicked 
      //remove any previously selected styles
      document.querySelector('li.selected')?.classList.remove('selected');
      //Highlight the newly selected person 
      li.classList.add('selected');
      //and load all the gift idea documents for that person
      getIdeas(id);
      ideas.length = 0;
    }
  }else{
    //clicked a button not inside <li class="person">
    //Show the dialog form to ADD the doc (same form as EDIT)
    //showOverlay function can be called from here or with the click listener in DOMContentLoaded, not both
  }
}

function saveIt(ev) {
  ev.preventDefault()
  const editPpl = doc(db, 'people', selectedPersonId);
  // const edited = document.querySelector('.edit');
  updateDoc(editPpl, {
    name: document.getElementById("nameEdit").value,
    day: document.getElementById("dayEdit").value,
    month: document.getElementById("monthEdit").value
  })
  hideOverlayPpl();
}

function deleteIt(ev){
  ev.preventDefault()
  // let ppl = ev.target.closest('.person');
  // let id = ppl.getAttribute('data-id');
  let id = selectedPersonId;
  console.log(id);
  const deletePpl = doc(db, 'people', id)
  deleteDoc(deletePpl)
    .then(() =>{
      // people.reset();
    })
  hideOverlayPpl();
};

function hideOverlayPpl(){
  document.querySelector('.overlayPpl').classList.remove('active');
  document
    .querySelectorAll('.overlayPpl dialog')
    .forEach((dialog) => dialog.classList.remove('active'));
}

/* CODE FOR IDEAS */

async function getIdeas(id){
  //the person-id property in gift-ideas will be like `/people/lasdjkflaskdfjsdlfk`
  //and it is a REFERENCE not a string. So, we use a reference to the person object
  const personRef = doc(collection(db, 'people'), id);
  // const ideaCollectionRef = collection(db, "gift-ideas"); //collection we want to query
  // const docs = query(
  //   ideaCollectionRef,
  //   where('person-id', '==', personRef),
  // );
  //then run a query where the `person-id` property matches the reference for the person
  const docs = query(
    collection(db, 'gift-ideas'),
    where('person-id', '==', personRef),
    // orderBy('birth-month')
  );
  const querySnapshot = await getDocs(docs);
  querySnapshot.forEach((docs) => {
    //every `doc` object has a `id` property that holds the `_id` value from Firestore.
    //every `doc` object has a doc() method that gives you a JS object with all the properties
    const data = docs.data();
    const id = docs.id;
    //person_id is a reference type
    //we want the actual id string in our object use id to get the _id
    // console.log(data['person-id']);
    ideas.push({id, 
      title: data.title,
      location: data.location,
      bought: data.bought,
      person_id: data['person-id'].id,
      person_ref: data['person-id'],
    });

  });
  //now build the HTML from the ideas array
  buildIdeas(ideas);
}

function buildIdeas(ideas){
  const ul = document.querySelector('.idea-list');
  if(ideas.length){
    ul.innerHTML = ideas.map(ideas=>{
      return `<li class="idea" data-id="${ideas.id}">
                <label for="chk-${ideas.id}"
                  ><input type="checkbox" id="chk-${ideas.id}" /> Bought</label
                >
                <p class="title">${ideas.title}</p>
                <p class="location">${ideas.location}</p>
                <button class="editIdea"> Edit </button>
                <button class="deleteIdea"> Delete </button>
              </li>`;
    }).join('');
  }else{
    ul.innerHTML = '<li class="idea"><p></p><p>No Gift Ideas for selected person.</p></li>'; //clear in case there are no records to shows
  }
  //add listener for 'change' or 'input' event on EVERY checkbox '.idea [type="checkbox"]'
  // which will call a function to update the `bought` value for the document
  // console.log(ideas.length);
}

async function saveIdea() {
  //take the information from the dialog, save as an object, push to firestore
  let title = document.getElementById('title').value;
  let location = document.getElementById('location').value;
  if(!title || !location ) return; //form needs more info 
  //a new idea needs a reference to the person
  const personRef = doc(db, `/people/${selectedPersonId}`);
  const idea = {
    title,
    location,
    'person-id': personRef
  };

  try {
    const docRef = await addDoc(collection(db, 'gift-ideas'), idea );
    console.log('Document written with ID: ', docRef.id);
    idea.id = docRef.id;
    //1. clear the form fields 
    document.getElementById('title').value = '';
    document.getElementById('location').value = '';
    //2. hide the dialog and the overlay by clicking on overlay
    document.querySelector('.overlay').click();
    //3. TODO: display a message to the user about success 
    
    //4. ADD the new HTML to the <ul> using the new object
    //just recall the method to show all ideas for the selected person
    getIdeas(selectedPersonId);
  } catch (err) {
    console.error('Error adding document: ', err);
    //do you want to stay on the dialog?
    //display a mesage to the user about the problem
  }
  //TODO: update this function to work as an UPDATE method too
}
function handleSelectIdea(ev){
  const li = ev.target.closest('.idea');
  const id = li ? li.getAttribute('data-id') : null;
  
  if(id){
    //user clicked inside li
    selectedPersonId = id;
    //did they click the li content OR an edit button OR a delete button?
    if(ev.target.classList.contains('editIdea')){
      //EDIT the doc using the id to get a docRef
      ev.preventDefault();
      document.querySelector('.overlayIdea').classList.add('active');
      document.getElementById('editIdea').classList.add('active');
      //show the dialog form to EDIT the doc (same form as ADD)
      //Load all the Person document details into the form from docRef
      document.getElementById('btnSaveIdeas').addEventListener('click', saveGiftIdea);
      document.getElementById('btnCancelIdeas').addEventListener('click', function(ev){
        hideOverlayIdea();
      });
    }else if(ev.target.classList.contains('deleteIdea')){
      ev.preventDefault();
      document.querySelector('.overlayIdea').classList.add('active');
      document.getElementById('deleteIdea').classList.add('active');
      //DELETE the doc using the id to get a docRef
      //do a confirmation before deleting 
      document.getElementById('btnDeleteIdeas').addEventListener('click', deleteIdea);
      document.getElementById('btnCancelIdeas2').addEventListener('click', function(ev){
        hideOverlayIdea();
      });
  }else{
    //clicked a button not inside <li class="person">
    //Show the dialog form to ADD the doc (same form as EDIT)
    //showOverlay function can be called from here or with the click listener in DOMContentLoaded, not both
  }
}
}

function saveGiftIdea(ev) {
  ev.preventDefault()
  const editIdea = doc(db, 'ideas', selectedIdeaId);
  // const edited = document.querySelector('.edit');
  updateDoc(editIdea, {
    title: document.getElementById("titleEdit").value,
    location: document.getElementById("locationEdit").value
  })
  hideOverlayIdea();
}

function deleteIdea(ev){
  ev.preventDefault()
  let id = ev.target.dataset.id
  console.log(id);
  const deletePpl = doc(db, 'ideas', id)
  deleteDoc(deletePpl)
    .then(() =>{
    })
  hideOverlayIdea();
};

function hideOverlayIdea(){
  document.querySelector('.overlayIdea').classList.remove('active');
  document
    .querySelectorAll('.overlayIdea dialog')
    .forEach((dialog) => dialog.classList.remove('active'));
}

/* CODE FOR OVERLAY */

function hideOverlay(ev) {
  ev.preventDefault();
  if(!ev.target.classList.contains('overlay') &&
    ev.target.id != 'btnCancelIdea' &&
    ev.target.id != 'btnCancelPerson' &&
    ev.target.id != 'btnSavePerson' &&
    ev.target.id != 'btnSaveIdea' &&
    ev.target.id != 'btnSign' &&
    ev.target.id != 'btnCancelSignIn'
  ) return;

  document.querySelector('.overlay').classList.remove('active');
  document
    .querySelectorAll('.overlay dialog')
    .forEach((dialog) => dialog.classList.remove('active'));
}
function showOverlay(ev) {
  ev.preventDefault();
  document.querySelector('.overlay').classList.add('active');
  if(ev.target.id === 'btnAddPerson'){
    document.getElementById('dlgPerson').classList.add('active');
  } else if(ev.target.id === 'btnAddIdea'){
    document.getElementById('dlgIdea').classList.add('active');
  } else if(ev.target.id === 'btnSignIn'){
    document.getElementById('dlgSignIn').classList.add('active');
  } 
}

/* CODE FOR SIGNIN */
function handleSignIn(){
  document.getElementById('btnSign').addEventListener('click', attemptLogin);
}

// URL to request github user's identity
// GET https://github.com/login/oauth/authorize

//to be used inside a function 
if(user !== null){
  //user is logged in
  const displayName = user.displayName;
  const email = user.email;
  const photoURL = user.photoURL;
  const emailVerified = user.emailVerified;
}else{
  //user is not logged in 
}

//track when the user logs in or out 
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, see docs for a list of available properties
    // https://firebase.google.com/docs/reference/js/firebase.User
    const uid = user.uid;
    // ...
    console.log("loged in");
  } else {
    // User is signed out
    // ...
    console.log("loged out");
  }
});

function attemptLogin(signInWithPopup){
  //try to login with the global auth and provider objects
  setPersistence(auth, browserSessionPersistence)
  .then(() => {
    // Existing and future Auth states are now persisted in the current
    // session only. Closing the window would clear any existing state even
    // if a user forgets to sign out.
    const provider = new GithubAuthProvider();
    // ...
    // New sign-in will be persisted with session persistence.
    signInWithPopup(auth, provider)
    .then((result) => {
      console.log(result);
      //IF YOU USED GITHUB PROVIDER 
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      window.sessionStorage.setItem("gitToken", JSON.stringify(token))

      // The signed-in user info.
      const user = result.user;
      console.log(`name: ${user.displayName}`)
      // ...
    }).catch((error) => {
      console.log(error.message);
    }); 
    //return the call to your desired login method
  })
  .catch((error) => {
    // Handle Errors here.
      console.log(error);
  });
}

function validateWithToken(token){
  const credential = GithubAuthProvider.credential(token);
  signInWithCredential(auth, credential)
    .then((result) => {
      //the token and credential were still valid 
      console.log(result);
    })
    .catch((error) => {
      // Handle Errors here.
      const errorMessage = error.message;
      console.log(errorMessage);
    })
}
