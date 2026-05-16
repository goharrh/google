<?php
header("Content-Type: application/json");

include 'dbcon.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $teacher_id = intval($_POST['teacher_id'] ?? 0);

    if ($teacher_id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid teacher ID"]);
        exit;
    }

    $today = date("Y-m-d");
    $current_time = date("H:i:s");

    $stmt = $conn->prepare("SELECT id, check_in, check_out FROM teacher_attendance WHERE teacher_id = ? AND attendance_date = ?");
    $stmt->bind_param("is", $teacher_id, $today);
    $stmt->execute();
    $result = $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        if (empty($row['check_in'])) {
            echo json_encode(["success" => false, "message" => "You have not checked in yet"]);
        } elseif (!empty($row['check_out'])) {
            echo json_encode(["success" => false, "message" => "Already checked out today"]);
        } else {
            // Update check-out time
            $upd = $conn->prepare("UPDATE teacher_attendance SET check_out = ? WHERE id = ?");
            $upd->bind_param("si", $current_time, $row['id']);
            $upd->execute();
            echo json_encode(["success" => true, "message" => "Checked out successfully at " . $current_time]);
            $upd->close();
        }
    } else {
        echo json_encode(["success" => false, "message" => "No attendance record found for today"]);
    }
    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid request method"]);
}

$conn->close();
?>