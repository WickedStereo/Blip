const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

// This function will run every 6 hours
exports.deleteOldMessages = onSchedule("every 6 hours", async (event) => {
    logger.info("Starting to delete messages older than 24 hours.");

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const timestamp = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);

    const chatRoomsSnapshot = await db.collection("chatRooms").get();

    if (chatRoomsSnapshot.empty) {
        logger.info("No chat rooms found. Nothing to do.");
        return null;
    }

    logger.info(`Found ${chatRoomsSnapshot.size} chat rooms. Checking for old messages...`);

    let totalDeleted = 0;

    for (const roomDoc of chatRoomsSnapshot.docs) {
        const messagesRef = roomDoc.ref.collection("messages");
        const oldMessagesQuery = messagesRef.where("timestamp", "<", timestamp);

        // Process in batches to avoid overwhelming the function
        let batch = db.batch();
        let batchCount = 0;
        const snapshot = await oldMessagesQuery.get();

        if (snapshot.empty) {
            continue; // No old messages in this room
        }

        snapshot.forEach(doc => {
            batch.delete(doc.ref);
            batchCount++;
            if (batchCount === 499) { // Firestore batch limit is 500
                batch.commit();
                totalDeleted += batchCount;
                batch = db.batch();
                batchCount = 0;
            }
        });

        if (batchCount > 0) {
            await batch.commit();
            totalDeleted += batchCount;
        }

        logger.info(`Deleted ${snapshot.size} messages from room ${roomDoc.id}.`);
    }

    if (totalDeleted > 0) {
        logger.info(`Successfully deleted a total of ${totalDeleted} old messages.`);
    } else {
        logger.info("No old messages were found to delete.");
    }

    return null;
});

// This function will run once a day to delete inactive rooms
exports.deleteInactiveRooms = onSchedule("every 24 hours", async (event) => {
    logger.info("Starting to delete inactive chat rooms.");

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const timestamp = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);

    const roomsSnapshot = await db.collection("chatRooms").get();
    let roomsDeleted = 0;

    for (const roomDoc of roomsSnapshot.docs) {
        const messagesRef = roomDoc.ref.collection("messages");
        const latestMessage = await messagesRef.orderBy("timestamp", "desc").limit(1).get();

        if (latestMessage.empty) {
            // Room has no messages, delete it.
            await deleteRoom(roomDoc.ref);
            roomsDeleted++;
            logger.info(`Deleted empty room: ${roomDoc.id}`);
        } else {
            const lastMessageTimestamp = latestMessage.docs[0].data().timestamp;
            if (lastMessageTimestamp < timestamp) {
                // Last message is older than 24 hours, delete the room.
                await deleteRoom(roomDoc.ref);
                roomsDeleted++;
                logger.info(`Deleted inactive room: ${roomDoc.id}`);
            }
        }
    }

    if (roomsDeleted > 0) {
        logger.info(`Successfully deleted ${roomsDeleted} inactive rooms.`);
    } else {
        logger.info("No inactive rooms found to delete.");
    }

    return null;
});

async function deleteRoom(roomRef) {
    // This is a simplified deletion. For very large rooms, a more robust
    // recursive deletion function might be needed, but this is a good start.
    const messages = await roomRef.collection('messages').get();
    const presences = await roomRef.collection('users').get();
    const batch = db.batch();

    messages.forEach(doc => batch.delete(doc.ref));
    presences.forEach(doc => batch.delete(doc.ref));
    batch.delete(roomRef);

    return batch.commit();
}
