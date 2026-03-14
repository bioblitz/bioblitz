"use client";

import { useEffect, useState } from "react";
import { Auth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
  writeBatch,
  Firestore,
} from "firebase/firestore";
import { createNotification } from "@/lib/notifications";
import { FriendshipStatus, UserProfile } from "./types";

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

        const friendsData = await Promise.all(
          friendsSnap.docs.map(async (friendDoc) => {
            const uid = (friendDoc.data() as any).uid;
            if (!uid) return null;
            const userSnap = await getDoc(doc(db, "users", uid));
            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile;
              return { ...data, uid: userSnap.id };
            }
            return null;
          })
        );
        setFriends(friendsData.filter((u): u is UserProfile => u !== null));

        if (currentUser.uid === profileUid) {
          const requestsQuery = query(
            collection(db, "users", currentUser.uid, "friends"),
            where("status", "==", "received")
          );
          const requestsSnap = await getDocs(requestsQuery);

          const requestsData = await Promise.all(
            requestsSnap.docs.map(async (reqDoc) => {
              const uid = (reqDoc.data() as any).uid;
              if (!uid) return null;
              const userSnap = await getDoc(doc(db, "users", uid));
              if (userSnap.exists()) {
                const data = userSnap.data() as UserProfile;
                return { ...data, uid: userSnap.id };
              }
              return null;
            })
          );
          setIncomingRequests(
            requestsData.filter((u): u is UserProfile => u !== null)
          );
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

      const batch = writeBatch(db);

      const myRef = doc(db, "users", auth.currentUser.uid, "friends", targetUid);
      batch.set(myRef, {
        uid: targetUid,
        status: "sent",
        createdAt: Timestamp.now(),
        displayName: targetUserData.displayName || "",
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
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
      });

      const theirRef = doc(db, "users", profileUid, "friends", auth.currentUser.uid);
      batch.set(theirRef, {
        uid: auth.currentUser.uid,
        status: "received",
        createdAt: Timestamp.now(),
        displayName: auth.currentUser.displayName || "Unknown",
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
    addFriendByUsername,
    removeFriend,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    handleAcceptIncomingRequest,
    handleDeclineIncomingRequest,
  };
}
