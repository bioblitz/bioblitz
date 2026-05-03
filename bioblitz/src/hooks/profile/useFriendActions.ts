"use client";

import { useEffect, useState } from "react";
import { Auth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  Timestamp,
  where,
  writeBatch,
  Firestore,
} from "firebase/firestore";
import { createNotification } from "@/lib/notifications";
import { FriendshipStatus, UserProfile } from "./types";

export interface SearchUser {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
}

interface UseFriendActionsParams {
  auth: Auth;
  db: Firestore;
  profileUid: string | null;
  userProfile: UserProfile | null;
}

export function useFriendActions({
  auth,
  db,
  profileUid,
  userProfile,
}: UseFriendActionsParams) {
  const [friendshipStatus, setFriendshipStatus] =
    useState<FriendshipStatus>("none");
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<UserProfile[]>([]);
  const [friendUsernameInput, setFriendUsernameInput] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [userSearchResults, setUserSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addFriendSuccess, setAddFriendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!profileUid) return;

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setLoadingFriends(false);
      setFriends([]);
      setIncomingRequests([]);
      return;
    }

    const checkRelationshipStatus = async () => {
      if (currentUser.uid === profileUid) return;

      try {
        const relationshipRef = doc(
          db,
          "users",
          currentUser.uid,
          "friends",
          profileUid
        );
        const relationshipSnap = await getDoc(relationshipRef);

        if (relationshipSnap.exists()) {
          const status = (relationshipSnap.data() as any).status;
          setFriendshipStatus(status as FriendshipStatus);
        } else {
          setFriendshipStatus("none");
        }
      } catch (err) {
        console.error("Error checking relationship status:", err);
      }
    };

    const fetchFriendsAndRequests = async () => {
      setLoadingFriends(true);
      try {
        const friendsQuery = query(
          collection(db, "users", profileUid, "friends"),
          where("status", "==", "friends")
        );
        const friendsSnap = await getDocs(friendsQuery);

        const friendsData = friendsSnap.docs
          .map((friendDoc) => {
            const d = friendDoc.data() as any;
            if (!d.uid) return null;
            return {
              uid: d.uid,
              displayName: d.displayName || "",
              username: d.username || "",
              photoURL: d.photoURL || "",
            } as UserProfile;
          })
          .filter((u): u is UserProfile => u !== null);
        setFriends(friendsData);

        if (currentUser.uid === profileUid) {
          const requestsQuery = query(
            collection(db, "users", currentUser.uid, "friends"),
            where("status", "==", "received")
          );
          const requestsSnap = await getDocs(requestsQuery);

          const requestsData = requestsSnap.docs
            .map((reqDoc) => {
              const d = reqDoc.data() as any;
              if (!d.uid) return null;
              return {
                uid: d.uid,
                displayName: d.displayName || "",
                username: d.username || "",
                photoURL: d.photoURL || "",
              } as UserProfile;
            })
            .filter((u): u is UserProfile => u !== null);
          setIncomingRequests(requestsData);
        }
      } catch (err) {
        console.error("Error fetching friends/requests:", err);
      } finally {
        setLoadingFriends(false);
      }
    };

    checkRelationshipStatus();
    fetchFriendsAndRequests();
  }, [auth.currentUser, db, profileUid]);

  useEffect(() => {
    const term = friendUsernameInput.trim().toLowerCase();
    if (!term) {
      setUserSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("username", ">=", term),
          where("username", "<=", term + "\uf8ff"),
          limit(6)
        );
        const snap = await getDocs(q);
        const currentUid = auth.currentUser?.uid;
        setUserSearchResults(
          snap.docs
            .filter((d) => d.id !== currentUid)
            .map((d) => ({
              uid: d.id,
              displayName: d.data().displayName || "",
              username: d.data().username || "",
              photoURL: d.data().photoURL || "",
            }))
        );
      } catch (err) {
        console.error("User search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [friendUsernameInput, db, auth.currentUser]);

  const addFriendByUid = async (target: SearchUser) => {
    if (!auth.currentUser) return;

    try {
      const [myFriendSnap, myUserSnap] = await Promise.all([
        getDoc(doc(db, "users", auth.currentUser.uid, "friends", target.uid)),
        getDoc(doc(db, "users", auth.currentUser.uid)),
      ]);

      if (myFriendSnap.exists()) {
        const status = (myFriendSnap.data() as any).status;
        if (status === "friends") { setAddFriendSuccess("Already friends."); return; }
        if (status === "sent") { setAddFriendSuccess("Request already sent."); return; }
        if (status === "received") { setAddFriendSuccess("They already sent you a request!"); return; }
      }

      const myUsername = (myUserSnap.data() as any)?.username || "";

      const batch = writeBatch(db);
      batch.set(doc(db, "users", auth.currentUser.uid, "friends", target.uid), {
        uid: target.uid,
        status: "sent",
        createdAt: Timestamp.now(),
        displayName: target.displayName,
        username: target.username,
        photoURL: target.photoURL,
      });
      batch.set(doc(db, "users", target.uid, "friends", auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        status: "received",
        createdAt: Timestamp.now(),
        displayName: auth.currentUser.displayName || "Unknown",
        username: myUsername,
        photoURL: auth.currentUser.photoURL || "",
      });
      await batch.commit();

      setFriendUsernameInput("");
      setUserSearchResults([]);
      setAddFriendSuccess(`Request sent to @${target.username}!`);
      setTimeout(() => setAddFriendSuccess(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const addFriendByUsername = async () => {
    if (!auth.currentUser || !friendUsernameInput) return;

    try {
      const cleaned = friendUsernameInput.trim().toLowerCase();
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", cleaned));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("User not found!");
        return;
      }

      const targetUserDoc = querySnapshot.docs[0];
      const targetUid = targetUserDoc.id;
      const targetUserData: any = targetUserDoc.data();

      if (targetUid === auth.currentUser.uid) {
        alert("You cannot add yourself!");
        return;
      }

      const myFriendDocRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "friends",
        targetUid
      );
      const myFriendSnap = await getDoc(myFriendDocRef);

      if (myFriendSnap.exists()) {
        const status = (myFriendSnap.data() as any).status;
        if (status === "friends") {
          alert("Already friends.");
          return;
        }
        if (status === "sent") {
          alert("Request already sent.");
          return;
        }
        if (status === "received") {
          alert("They already sent you a request.");
          return;
        }
      }

      const myUserSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const myUsername = (myUserSnap.data() as any)?.username || "";

      const batch = writeBatch(db);

      const myRef = doc(db, "users", auth.currentUser.uid, "friends", targetUid);
      batch.set(myRef, {
        uid: targetUid,
        status: "sent",
        createdAt: Timestamp.now(),
        displayName: targetUserData.displayName || "",
        username: targetUserData.username || "",
        photoURL: targetUserData.photoURL || "",
      });

      const theirRef = doc(
        db,
        "users",
        targetUid,
        "friends",
        auth.currentUser.uid
      );
      batch.set(theirRef, {
        uid: auth.currentUser.uid,
        status: "received",
        createdAt: Timestamp.now(),
        displayName: auth.currentUser.displayName || "Unknown",
        username: myUsername,
        photoURL: auth.currentUser.photoURL || "",
      });

      await batch.commit();
      alert(`Friend request sent to ${targetUserData.username}!`);
      setFriendUsernameInput("");
    } catch (err) {
      console.error(err);
      alert("Error adding friend.");
    }
  };

  const removeFriend = async () => {
    if (!auth.currentUser || !profileUid) return;

    if (!confirm("Are you sure you want to remove this friend?")) return;

    try {
      const batch = writeBatch(db);

      const myRef = doc(db, "users", auth.currentUser.uid, "friends", profileUid);
      batch.delete(myRef);

      const theirRef = doc(db, "users", profileUid, "friends", auth.currentUser.uid);
      batch.delete(theirRef);

      await batch.commit();
      setFriendshipStatus("none");
    } catch (err) {
      console.error("Error removing friend:", err);
      alert("Failed to remove friend. Please try again.");
    }
  };

  const sendFriendRequest = async () => {
    if (!auth.currentUser || !userProfile || !profileUid) return;

    const myDocSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const myData = myDocSnap.data() as UserProfile;
    const myUsername = (myData?.username || auth.currentUser.uid).toString();

    try {
      const batch = writeBatch(db);

      const myRef = doc(db, "users", auth.currentUser.uid, "friends", profileUid);
      batch.set(myRef, {
        uid: profileUid,
        status: "sent",
        createdAt: Timestamp.now(),
        displayName: userProfile.displayName || "",
        username: userProfile.username || "",
        photoURL: userProfile.photoURL || "",
      });

      const theirRef = doc(db, "users", profileUid, "friends", auth.currentUser.uid);
      batch.set(theirRef, {
        uid: auth.currentUser.uid,
        status: "received",
        createdAt: Timestamp.now(),
        displayName: auth.currentUser.displayName || "Unknown",
        username: myData?.username || "",
        photoURL: auth.currentUser.photoURL || "",
      });

      await batch.commit();
      setFriendshipStatus("sent");
      await createNotification(
        profileUid,
        "friend_request",
        "New Friend Request",
        `${auth.currentUser.displayName || "Someone"} wants to be friends!`,
        `/profile/${myUsername}`,
        auth.currentUser.uid,
        myData.photoURL || "",
        auth.currentUser.displayName || "A user"
      );
    } catch (err) {
      console.error(err);
      alert("Failed to send request.");
    }
  };

  const acceptFriendRequest = async () => {
    if (!auth.currentUser || !profileUid) return;

    const myDocSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const myData = myDocSnap.data() as UserProfile;
    const myUsername = (myData?.username || auth.currentUser.uid).toString();

    try {
      const batch = writeBatch(db);
      const myRef = doc(db, "users", auth.currentUser.uid, "friends", profileUid);
      const theirRef = doc(db, "users", profileUid, "friends", auth.currentUser.uid);
      batch.update(myRef, { status: "friends" });
      batch.update(theirRef, { status: "friends" });
      await batch.commit();
      setFriendshipStatus("friends");

      await createNotification(
        profileUid,
        "friend_accept",
        "Friend Request Accepted",
        `${auth.currentUser.displayName || "User"} accepted your friend request!`,
        `/profile/${myUsername}`,
        auth.currentUser.uid,
        auth.currentUser.photoURL || "",
        auth.currentUser.displayName || "A user"
      );
    } catch (err) {
      console.error(err);
    }
  };

  const declineFriendRequest = async () => {
    if (!auth.currentUser || !profileUid) return;
    try {
      const batch = writeBatch(db);
      const myRef = doc(db, "users", auth.currentUser.uid, "friends", profileUid);
      const theirRef = doc(db, "users", profileUid, "friends", auth.currentUser.uid);
      batch.delete(myRef);
      batch.delete(theirRef);
      await batch.commit();
      setFriendshipStatus("none");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptIncomingRequest = async (request: UserProfile) => {
    if (!auth.currentUser) return;

    const batch = writeBatch(db);
    const myRef = doc(db, "users", auth.currentUser.uid, "friends", request.uid);
    const theirRef = doc(db, "users", request.uid, "friends", auth.currentUser.uid);
    batch.update(myRef, { status: "friends" });
    batch.update(theirRef, { status: "friends" });
    await batch.commit();

    setIncomingRequests((prev) => prev.filter((r) => r.uid !== request.uid));
    setFriends((prev) => [...prev, request]);

    const myUsername = userProfile?.username || auth.currentUser.uid;
    await createNotification(
      request.uid,
      "friend_accept",
      "Friend Request Accepted",
      `${auth.currentUser.displayName || "User"} accepted your friend request!`,
      `/profile/${myUsername}`,
      auth.currentUser.uid,
      auth.currentUser.photoURL || ""
    );
  };

  const handleDeclineIncomingRequest = async (request: UserProfile) => {
    if (!auth.currentUser) return;

    const batch = writeBatch(db);
    const myRef = doc(db, "users", auth.currentUser.uid, "friends", request.uid);
    const theirRef = doc(db, "users", request.uid, "friends", auth.currentUser.uid);
    batch.delete(myRef);
    batch.delete(theirRef);
    await batch.commit();

    setIncomingRequests((prev) => prev.filter((r) => r.uid !== request.uid));
  };

  return {
    friendshipStatus,
    friends,
    incomingRequests,
    friendUsernameInput,
    setFriendUsernameInput,
    loadingFriends,
    userSearchResults,
    isSearching,
    addFriendSuccess,
    addFriendByUid,
    addFriendByUsername,
    removeFriend,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    handleAcceptIncomingRequest,
    handleDeclineIncomingRequest,
  };
}
